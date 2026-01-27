import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import PhoneInput, {
  ICountry,
  getCountryByCca2,
} from 'react-native-international-phone-number';
import { CountryCode } from 'libphonenumber-js';
import { useAuth } from '@/lib/firebase';
import * as analytics from '@/lib/analytics';
import { userService } from '@/lib/firebase/user';
import { toE164, cleanVerificationCode, isValidPhone } from '@/lib/phone';

type OnboardingStep = 'welcome' | 'name' | 'phone' | 'verify';

const STEPS: OnboardingStep[] = ['welcome', 'name', 'phone', 'verify'];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    sendVerificationCode,
    confirmCode,
    phoneAuthState,
    resetPhoneAuth,
    clearPhoneAuthError,
    isAuthenticated,
    user,
  } = useAuth();

  // Lock to portrait orientation
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, [])
  );

  // Step state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const stepIndex = STEPS.indexOf(currentStep);

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry>(
    getCountryByCca2('US')!
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Refs for auto-submit tracking
  const lastAutoSubmittedPhone = useRef<string | null>(null);
  const lastAutoSubmittedCode = useRef<string | null>(null);
  const verificationInputRef = useRef<TextInput>(null);

  // Animation values
  const progress = useSharedValue(0);

  // Update progress bar
  useEffect(() => {
    const targetProgress = (stepIndex / (STEPS.length - 1)) * 100;
    progress.value = withSpring(targetProgress, { damping: 15, stiffness: 100 });
  }, [stepIndex, progress]);

  // Progress bar style
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  // Handle authentication success - save name and redirect to game
  useEffect(() => {
    const handleAuthSuccess = async () => {
      if (isAuthenticated && user && currentStep === 'verify') {
        console.log('[Onboarding] User authenticated, saving name and redirecting...');

        // Save display name to Firestore
        if (name.trim()) {
          try {
            await userService.updateProfile(user.uid, { displayName: name.trim() });
            console.log('[Onboarding] Name saved to Firestore');
          } catch (error) {
            console.error('[Onboarding] Failed to save name:', error);
          }
        }

        // Identify user for analytics after successful signup
        analytics.identifyUser(user.uid, {
          name: name.trim() || undefined,
          display_name: name.trim() || undefined,
          phone_number: user.phoneNumber ?? undefined,
        });

        // Go to home
        router.replace('/home');
      }
    };

    handleAuthSuccess();
  }, [isAuthenticated, user, currentStep, name, router]);

  // Auto-advance to verify step when code is sent
  useEffect(() => {
    // Advance when we have a verificationId and we're on the phone step
    if (
      phoneAuthState.verificationId &&
      phoneAuthState.step === 'verifying' &&
      currentStep === 'phone'
    ) {
      setCurrentStep('verify');
      // Focus verification input
      setTimeout(() => {
        verificationInputRef.current?.focus();
      }, 400);
    }
  }, [phoneAuthState.step, phoneAuthState.verificationId, currentStep]);

  // ============================================================================
  // Validation
  // ============================================================================

  const getE164Number = useCallback((): string | null => {
    const countryCode = selectedCountry?.cca2 as CountryCode;
    return toE164(phoneNumber, countryCode);
  }, [phoneNumber, selectedCountry]);

  const isPhoneValid = useCallback((): boolean => {
    const countryCode = selectedCountry?.cca2 as CountryCode;
    return isValidPhone(phoneNumber, countryCode);
  }, [phoneNumber, selectedCountry]);

  const isValidName = name.trim().length >= 2;
  const isValidCode = verificationCode.length === 6;
  const isSendingCode = phoneAuthState.step === 'sending';

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleStart = () => setCurrentStep('name');

  const handleNameContinue = () => {
    if (isValidName) {
      setCurrentStep('phone');
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);

    // Clear any previous error when user edits the phone number
    if (phoneAuthState.error) {
      clearPhoneAuthError();
    }

    // Reset auto-submit tracking if user is deleting
    if (value.length < phoneNumber.length) {
      lastAutoSubmittedPhone.current = null;
    }
  };

  const handleCountryChange = (country: ICountry) => {
    setSelectedCountry(country);
  };

  const handleSendCode = async () => {
    const e164 = getE164Number();
    if (!e164) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    // Prevent duplicate auto-submits
    if (lastAutoSubmittedPhone.current === e164) {
      return;
    }
    lastAutoSubmittedPhone.current = e164;

    console.log('[Onboarding] Sending code to:', e164);
    await sendVerificationCode(e164);
  };

  // Auto-submit when phone number becomes valid
  useEffect(() => {
    if (
      currentStep === 'phone' &&
      !isSendingCode &&
      isPhoneValid()
    ) {
      const e164 = getE164Number();
      if (e164 && lastAutoSubmittedPhone.current !== e164) {
        // Small delay to let user finish typing
        const timer = setTimeout(() => {
          handleSendCode();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [phoneNumber, selectedCountry, currentStep, isSendingCode]);

  const handleCodeChange = (text: string) => {
    const cleaned = cleanVerificationCode(text);
    setVerificationCode(cleaned);

    // Clear any previous error when user starts typing a new code
    if (phoneAuthState.error && cleaned.length > 0) {
      clearPhoneAuthError();
    }

    // Reset auto-submit tracking if user is deleting
    if (cleaned.length < verificationCode.length) {
      lastAutoSubmittedCode.current = null;
    }

    // Auto-submit when 6 digits entered
    if (
      cleaned.length === 6 &&
      !isConfirmingCode &&
      lastAutoSubmittedCode.current !== cleaned
    ) {
      lastAutoSubmittedCode.current = cleaned;
      handleVerifyCode(cleaned);
    }
  };

  const handleVerifyCode = async (codeOverride?: string) => {
    const code = codeOverride ?? verificationCode;
    if (code.length !== 6) return;

    setIsConfirmingCode(true);
    try {
      await confirmCode(code);
    } finally {
      setIsConfirmingCode(false);
    }
  };

  const handleResendCode = async () => {
    const e164 = getE164Number();
    if (!e164) return;

    setIsResending(true);
    setVerificationCode('');
    lastAutoSubmittedCode.current = null;

    try {
      resetPhoneAuth();
      await sendVerificationCode(e164);
      Alert.alert('Code Sent', 'A new verification code has been sent.');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      if (currentStep === 'verify') {
        resetPhoneAuth();
        setVerificationCode('');
        lastAutoSubmittedCode.current = null;
        lastAutoSubmittedPhone.current = null;
      }
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  // ============================================================================
  // Render Steps
  // ============================================================================

  const renderWelcome = () => (
    <Animated.View
      key="welcome"
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.heroContainer}>
        <View style={styles.heroGround} />
        <View style={styles.heroCircle}>
          <Text style={styles.heroEmoji}>🏡</Text>
        </View>
        <View style={[styles.treeDeco, styles.tree1]}>
          <Text style={styles.treeEmoji}>🌳</Text>
        </View>
        <View style={[styles.treeDeco, styles.tree2]}>
          <Text style={styles.treeEmoji}>🌲</Text>
        </View>
        <View style={[styles.flowerDeco, styles.flower1]}>
          <Text style={styles.flowerEmoji}>🌷</Text>
        </View>
        <View style={[styles.flowerDeco, styles.flower2]}>
          <Text style={styles.flowerEmoji}>🌻</Text>
        </View>
      </View>

      <View style={styles.welcomeTextContainer}>
        <Text style={styles.welcomeTitle}>Focus Town</Text>
        <Text style={styles.welcomeSubtitle}>Build your peaceful productivity</Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleStart}
      >
        <Text style={styles.primaryButtonText}>Let's Start! 🚀</Text>
      </Pressable>
    </Animated.View>
  );

  const renderName = () => (
    <Animated.View
      key="name"
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.header}>
        <Text style={styles.stepEmoji}>👋</Text>
        <Text style={styles.stepTitle}>What's your name?</Text>
        <Text style={styles.stepSubtitle}>We'll use this to personalize your town</Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor="#A89F91"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
          maxLength={20}
        />
        <Text style={styles.charCount}>{name.length}/20</Text>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            !isValidName && styles.buttonDisabled,
          ]}
          onPress={handleNameContinue}
          disabled={!isValidName}
        >
          <Text style={styles.primaryButtonText}>Continue →</Text>
        </Pressable>

        <Pressable style={styles.backLink} onPress={handleBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderPhone = () => (
    <Animated.View
      key="phone"
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.header}>
        <Text style={styles.stepEmoji}>📱</Text>
        <Text style={styles.stepTitle}>Your phone number</Text>
        <Text style={styles.stepSubtitle}>We'll send you a verification code</Text>
      </View>

      <View style={styles.formContainer}>
        <PhoneInput
          value={phoneNumber}
          onChangePhoneNumber={handlePhoneChange}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={handleCountryChange}
          defaultCountry="US"
          placeholder="Phone number"
          phoneInputStyles={{
            container: styles.phoneInputContainer,
            flagContainer: styles.phoneInputFlag,
            input: styles.phoneInputText,
            caret: styles.phoneInputCaret,
          }}
          modalStyles={{
            container: styles.countryModal,
            searchInput: styles.countrySearchInput,
            countryItem: styles.countryButton,
            callingCode: styles.countryCallingCode,
            countryName: styles.countryName,
          }}
        />

        {isSendingCode && (
          <View style={styles.sendingIndicator}>
            <ActivityIndicator size="small" color="#FFB347" />
            <Text style={styles.sendingText}>Sending code...</Text>
          </View>
        )}

        {!isSendingCode && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              !isPhoneValid() && styles.buttonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={!isPhoneValid() || isSendingCode}
          >
            <Text style={styles.primaryButtonText}>Send Code →</Text>
          </Pressable>
        )}

        <Pressable style={styles.backLink} onPress={handleBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {phoneAuthState.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{phoneAuthState.error}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderVerify = () => (
    <Animated.View
      key="verify"
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
    >
      <View style={styles.header}>
        <Text style={styles.stepEmoji}>✉️</Text>
        <Text style={styles.stepTitle}>Enter verification code</Text>
        <Text style={styles.stepSubtitle}>
          Sent to {selectedCountry?.idd?.root}{selectedCountry?.idd?.suffixes?.[0]} {phoneNumber}
        </Text>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          ref={verificationInputRef}
          style={[styles.input, styles.codeInput]}
          placeholder="000000"
          placeholderTextColor="#A89F91"
          value={verificationCode}
          onChangeText={handleCodeChange}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={6}
          autoFocus
        />

        {isConfirmingCode ? (
          <View style={styles.verifyingIndicator}>
            <ActivityIndicator size="small" color="#FFB347" />
            <Text style={styles.sendingText}>Verifying...</Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              !isValidCode && styles.buttonDisabled,
            ]}
            onPress={() => handleVerifyCode()}
            disabled={!isValidCode || isConfirmingCode}
          >
            <Text style={styles.primaryButtonText}>Verify ✓</Text>
          </Pressable>
        )}

        <View style={styles.verifyActions}>
          <Pressable
            style={styles.resendButton}
            onPress={handleResendCode}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="#5D4037" />
            ) : (
              <Text style={styles.resendText}>Resend Code</Text>
            )}
          </Pressable>

          <Pressable style={styles.backLink} onPress={handleBack}>
            <Text style={styles.backText}>← Change number</Text>
          </Pressable>
        </View>

        {phoneAuthState.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{phoneAuthState.error}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'name':
        return renderName();
      case 'phone':
        return renderPhone();
      case 'verify':
        return renderVerify();
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Background clouds */}
      <View style={[styles.cloud, styles.cloud1]} />
      <View style={[styles.cloud, styles.cloud2]} />
      <View style={[styles.cloud, styles.cloud3]} />

      {/* Progress bar (hidden on welcome) */}
      {currentStep !== 'welcome' && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.progressContainer, { top: insets.top + 16 }]}
        >
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
          <Text style={styles.progressText}>
            Step {stepIndex} of {STEPS.length - 1}
          </Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.content,
          {
            paddingTop: currentStep === 'welcome' ? insets.top + 40 : insets.top + 80,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {renderCurrentStep()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 50,
  },
  cloud1: {
    width: 120,
    height: 50,
    top: 60,
    left: -20,
  },
  cloud2: {
    width: 100,
    height: 40,
    top: 100,
    right: 30,
  },
  cloud3: {
    width: 80,
    height: 35,
    top: 160,
    left: 60,
  },
  progressContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFB347',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepContainer: {
    flex: 1,
  },
  // Welcome step
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  heroGround: {
    position: 'absolute',
    bottom: 20,
    left: -50,
    right: -50,
    height: 100,
    backgroundColor: '#90BE6D',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  heroCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF8E7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#DDD5C7',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 10,
  },
  heroEmoji: {
    fontSize: 70,
  },
  treeDeco: {
    position: 'absolute',
    zIndex: 5,
  },
  tree1: {
    left: 20,
    bottom: 60,
  },
  tree2: {
    right: 30,
    bottom: 70,
  },
  treeEmoji: {
    fontSize: 50,
  },
  flowerDeco: {
    position: 'absolute',
    zIndex: 5,
  },
  flower1: {
    left: 80,
    bottom: 40,
  },
  flower2: {
    right: 70,
    bottom: 35,
  },
  flowerEmoji: {
    fontSize: 28,
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#5D4037',
    letterSpacing: 1,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 8,
    fontWeight: '500',
  },
  // Other steps
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  stepEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5D4037',
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8D6E63',
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    // No flex: 1 - let content determine size
  },
  input: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 24,
    color: '#5D4037',
    borderWidth: 3,
    borderColor: '#DDD5C7',
    textAlign: 'center',
    fontWeight: '600',
  },
  codeInput: {
    letterSpacing: 8,
    fontSize: 32,
  },
  charCount: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 8,
  },
  // Phone input styles
  phoneInputContainer: {
    backgroundColor: '#FFF8E7',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#DDD5C7',
    height: 60,
  },
  phoneInputFlag: {
    backgroundColor: '#F5EFE6',
    borderTopLeftRadius: 13,
    borderBottomLeftRadius: 13,
  },
  phoneInputText: {
    fontSize: 20,
    color: '#5D4037',
    fontWeight: '600',
  },
  phoneInputCaret: {
    color: '#FFB347',
  },
  // Country modal styles
  countryModal: {
    backgroundColor: '#FFF8E7',
  },
  countrySearchInput: {
    backgroundColor: '#F5EFE6',
    borderColor: '#DDD5C7',
    color: '#5D4037',
  },
  countryButton: {
    borderBottomColor: '#DDD5C7',
  },
  countryCallingCode: {
    color: '#8D6E63',
  },
  countryName: {
    color: '#5D4037',
  },
  sendingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  verifyingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  sendingText: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#FFB347',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#E6A03C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFC875',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5D4037',
  },
  errorContainer: {
    marginTop: 16,
    backgroundColor: '#FFE4E1',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#C62828',
    textAlign: 'center',
    fontSize: 14,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  backText: {
    fontSize: 16,
    color: '#5D4037',
    opacity: 0.7,
  },
  verifyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
