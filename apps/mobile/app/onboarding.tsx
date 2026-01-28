import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
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
  ScrollView,
  ImageBackground,
  Linking,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  SharedValue,
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
import { PrimaryButton, BrownComponent, BackButton } from '@/components/ui';
import { DebugModal } from '@/components/debug-modal';
import { registerForPushNotifications } from '@/lib/notifications';

type Avatar = 'male' | 'female';

type OnboardingStep =
  | 'welcome'
  | 'name'
  | 'gender'
  | 'avatar'
  | 'age'
  | 'studyLocation'
  | 'socialBaseline'
  | 'studyFrequency'
  | 'sessionLength'
  | 'focusFriction'
  | 'focusFor'
  | 'goal'
  | 'username'
  | 'phone'
  | 'verify'
  | 'notifications'
  | 'discord';

type StudyLocation = 'home' | 'library' | 'cafe' | 'school';
type SocialBaseline = 'always' | 'often' | 'sometimes' | 'rarely' | 'never';
type StudyFrequency =
  | 'most_days'
  | 'weekdays'
  | 'few_times_week'
  | 'exam_only'
  | 'not_yet';
type SessionLength = '10_25' | '30_60' | '1_2' | '3_plus' | 'not_sure';
type FocusFriction = 'focused' | 'drift' | 'distracted' | 'cant_yet';
type FocusFor = 'university' | 'work' | 'job' | 'cert' | 'founder' | 'other';
type Goal =
  | 'habit'
  | 'longer_each_day'
  | 'more_days_week'
  | 'improve_gpa'
  | 'prepare_exam'
  | 'stay_focused';
type Gender = 'male' | 'female';

type OnboardingAnswers = {
  ageRange: string | null;
  studyLocation: StudyLocation | null;
  socialBaseline: SocialBaseline | null;
  studyFrequency: StudyFrequency | null;
  sessionLength: SessionLength | null;
  focusFriction: FocusFriction | null;
  focusFor: FocusFor | null;
  goal: Goal | null;
};

const BASE_STEPS: OnboardingStep[] = [
  'welcome',
  'name',
  'gender',
  'avatar',
  'age',
  'studyLocation',
  'socialBaseline',
  'studyFrequency',
  'sessionLength',
  'focusFriction',
  'focusFor',
  'goal',
  'username',
  'phone',
  'verify',
  'notifications',
  'discord',
];

const DISCORD_INVITE_URL = 'https://discord.gg/XbmKqmgdCb';

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

  // Form state
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [onboardingAnswers, setOnboardingAnswers] = useState<OnboardingAnswers>({
    ageRange: null,
    studyLocation: null,
    socialBaseline: null,
    studyFrequency: null,
    sessionLength: null,
    focusFriction: null,
    focusFor: null,
    goal: null,
  });
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [isUsernameConfirmedAvailable, setIsUsernameConfirmedAvailable] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<ICountry>(
    getCountryByCca2('US')!
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [isConfirmingCode, setIsConfirmingCode] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showDebugModal, setShowDebugModal] = useState(false);

  const isAge23Plus =
    ageRange === '23 - 29' || ageRange === '30 - 40' || ageRange === '40+';
  const steps = isAge23Plus
    ? BASE_STEPS
    : BASE_STEPS.filter((step) => step !== 'focusFor');
  const stepIndex = steps.indexOf(currentStep);

  // Refs for auto-submit tracking
  const lastAutoSubmittedPhone = useRef<string | null>(null);
  const lastAutoSubmittedCode = useRef<string | null>(null);
  const verificationInputRef = useRef<TextInput>(null);
  const usernameInputRef = useRef<TextInput>(null);
  const lastAnimatedStep = useRef<OnboardingStep | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimesRef = useRef<number[]>([]);

  // Animation values
  const progress = useSharedValue(0);

  // Step animation values - staggered fade+rise effect
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslateY = useSharedValue(20);

  // Update progress bar
  useEffect(() => {
    const targetProgress = (stepIndex / (steps.length - 1)) * 100;
    progress.value = withSpring(targetProgress, { damping: 15, stiffness: 100 });
  }, [stepIndex, steps.length, progress]);

  // Trigger staggered animations when step changes (no flash)
  useLayoutEffect(() => {
    if (lastAnimatedStep.current === currentStep) {
      return;
    }
    lastAnimatedStep.current = currentStep;

    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }

    // Reset values
    titleOpacity.value = 0;
    titleTranslateY.value = 20;
    contentOpacity.value = 0;
    contentTranslateY.value = 20;
    buttonOpacity.value = 0;
    buttonTranslateY.value = 20;

    // Staggered animation helper
    const animateElement = (
      opacity: SharedValue<number>,
      translateY: SharedValue<number>,
      delay: number
    ) => {
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
      translateY.value = withDelay(
        delay,
        withSpring(0, { damping: 16, stiffness: 100, mass: 0.8 })
      );
    };

    // Animate with staggered delays immediately
    animateElement(titleOpacity, titleTranslateY, 50);
    animateElement(contentOpacity, contentTranslateY, 150);
    animateElement(buttonOpacity, buttonTranslateY, 250);

    // Focus inputs after animation completes to avoid keyboard flash
    if (currentStep === 'username') {
      focusTimerRef.current = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 400);
    }

    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
        focusTimerRef.current = null;
      }
    };
  }, [currentStep]);

  // Progress bar style
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  // Step animation styles
  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  // Handle authentication success - save name and redirect to game
  useEffect(() => {
    const handleAuthSuccess = async () => {
      if (isAuthenticated && user && currentStep === 'verify') {
        console.log('[Onboarding] User authenticated, saving name and redirecting...');

        // Save onboarding answers + profile fields to Firestore
        try {
          const onboardingData: OnboardingAnswers = {
            ageRange: ageRange ?? null,
            studyLocation: onboardingAnswers.studyLocation,
            socialBaseline: onboardingAnswers.socialBaseline,
            studyFrequency: onboardingAnswers.studyFrequency,
            sessionLength: onboardingAnswers.sessionLength,
            focusFriction: onboardingAnswers.focusFriction,
            focusFor: onboardingAnswers.focusFor,
            goal: onboardingAnswers.goal,
          };

          const profileUpdates: {
            displayName?: string;
            username?: string;
            onboarding: OnboardingAnswers;
          } = {
            onboarding: onboardingData,
          };

          if (name.trim()) {
            profileUpdates.displayName = name.trim();
          }

          if (username.trim()) {
            profileUpdates.username = username.trim();
          }

          await userService.updateProfile(user.uid, profileUpdates);
          console.log('[Onboarding] Profile saved to Firestore');
        } catch (error) {
          console.error('[Onboarding] Failed to save onboarding:', error);
        }

        // Identify user for analytics after successful signup
        analytics.identifyUser(user.uid, {
          name: name.trim() || undefined,
          display_name: name.trim() || undefined,
          phone_number: user.phoneNumber ?? undefined,
        });

        // Continue to notifications permission prompt
        setCurrentStep('notifications');
      }
    };

    handleAuthSuccess();
  }, [isAuthenticated, user, currentStep, name, username, ageRange, onboardingAnswers, router]);

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
  const isAgeRange23Plus = (value: string | null) =>
    value === '23 - 29' || value === '30 - 40' || value === '40+';

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleTripleTap = useCallback(() => {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((t) => now - t < 500);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      setShowDebugModal(true);
      tapTimesRef.current = [];
    }
  }, []);

  const updateOnboardingAnswer = <K extends keyof OnboardingAnswers>(
    key: K,
    value: OnboardingAnswers[K]
  ) => {
    setOnboardingAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleStart = () => setCurrentStep('name');

  const handleNameContinue = () => {
    if (isValidName) {
      setCurrentStep('gender');
    }
  };

  const handleAvatarSelect = (selected: Avatar) => {
    setAvatar(selected);
  };

  const handleAvatarContinue = () => {
    if (avatar) {
      setCurrentStep('age');
    }
  };

  const handleAgeSelect = (option: string) => {
    setAgeRange(option);
    setOnboardingAnswers((prev) => ({
      ...prev,
      ageRange: option,
      focusFor: isAgeRange23Plus(option) ? prev.focusFor : null,
    }));
    // Brief delay to let the button selection animate before transitioning
    setTimeout(() => {
      setCurrentStep('studyLocation');
    }, 150);
  };

  const handleStudyLocationSelect = (value: StudyLocation) => {
    updateOnboardingAnswer('studyLocation', value);
    setTimeout(() => {
      setCurrentStep('socialBaseline');
    }, 150);
  };

  const handleSocialBaselineSelect = (value: SocialBaseline) => {
    updateOnboardingAnswer('socialBaseline', value);
    setTimeout(() => {
      setCurrentStep('studyFrequency');
    }, 150);
  };

  const handleStudyFrequencySelect = (value: StudyFrequency) => {
    updateOnboardingAnswer('studyFrequency', value);
    setTimeout(() => {
      setCurrentStep('sessionLength');
    }, 150);
  };

  const handleSessionLengthSelect = (value: SessionLength) => {
    updateOnboardingAnswer('sessionLength', value);
    setTimeout(() => {
      setCurrentStep('focusFriction');
    }, 150);
  };

  const handleFocusFrictionSelect = (value: FocusFriction) => {
    updateOnboardingAnswer('focusFriction', value);
    setTimeout(() => {
      setCurrentStep(isAge23Plus ? 'focusFor' : 'goal');
    }, 150);
  };

  const handleFocusForSelect = (value: FocusFor) => {
    setOnboardingAnswers((prev) => ({
      ...prev,
      focusFor: value,
      goal: value === 'university' || prev.goal !== 'improve_gpa' ? prev.goal : null,
    }));
    setTimeout(() => {
      setCurrentStep('goal');
    }, 150);
  };

  const handleGoalSelect = (value: Goal) => {
    updateOnboardingAnswer('goal', value);
    setTimeout(() => {
      setCurrentStep('username');
    }, 150);
  };

  const handleJoinDiscord = () => {
    Linking.openURL(DISCORD_INVITE_URL).catch((error) => {
      console.error('[Onboarding] Failed to open Discord invite:', error);
    });
    router.replace('/home');
  };

  const handleSkipDiscord = () => {
    router.replace('/home');
  };

  const handleNotificationAllow = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      setCurrentStep('discord');
      return;
    }
    Alert.alert('Notifications Disabled', 'You can enable notifications later in Settings.');
  };

  const handleNotificationDeny = () => {
    setCurrentStep('discord');
  };

  const sanitizeUsername = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9_]/g, '');

  const validateUsername = (value: string) => {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Min 3 characters';
    if (value.length > 16) return 'Max 16 characters';
    return null;
  };

  const generateUsernameSuggestions = (baseName: string) => {
    const base = sanitizeUsername(baseName).slice(0, 12);
    const fallback = base.length >= 3 ? base : 'focustown';
    const options = [
      fallback,
      `${fallback}${Math.floor(Math.random() * 90 + 10)}`,
      `${fallback}_${Math.floor(Math.random() * 90 + 10)}`,
    ];
    return Array.from(new Set(options))
      .map((option) => option.slice(0, 16))
      .filter((option) => option.length >= 3);
  };

  const checkUsernameAvailabilityDebounced = (value: string) => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    usernameCheckTimeout.current = setTimeout(async () => {
      if (!value || validateUsername(value)) {
        setIsUsernameAvailable(false);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const existing = await userService.findByUsername(value);
        setIsUsernameAvailable(!existing);
        setIsUsernameConfirmedAvailable(!existing);
        setUsernameError(existing ? 'Username already taken' : null);
        if (existing) {
          setUsernameSuggestions(generateUsernameSuggestions(name));
        } else {
          setUsernameSuggestions([]);
        }
      } catch (error) {
        console.error('[Onboarding] Username availability check failed:', error);
        setIsUsernameAvailable(false);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);
  };

  const handleUsernameChange = (value: string) => {
    const sanitized = sanitizeUsername(value);
    setUsername(sanitized);
    const error = validateUsername(sanitized);
    setUsernameError(error);
    if (error) {
      setIsUsernameAvailable(false);
      setIsUsernameConfirmedAvailable(false);
      setUsernameSuggestions(generateUsernameSuggestions(name));
      return;
    }

    checkUsernameAvailabilityDebounced(sanitized);
  };

  const handleUsernameContinue = async () => {
    const error = validateUsername(username);
    if (error || isCheckingUsername || !isUsernameAvailable) {
      setUsernameError(error || 'Username already taken');
      return;
    }
    setCurrentStep('phone');
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
      setCurrentStep(steps[prevIndex]);
    }
  };

  // ============================================================================
  // Render Steps
  // ============================================================================

  const renderOptionStep = <T extends string>({
    title,
    subtitle,
    options,
    selectedValue,
    onSelect,
  }: {
    title: string;
    subtitle?: string;
    options: { value: T; label: string }[];
    selectedValue: T | null;
    onSelect: (value: T) => void;
  }) => (
    <View key={title} style={styles.onboardingStepContainer}>
      <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
        <Text style={styles.onboardingTitle}>{title}</Text>
        {subtitle ? <Text style={styles.onboardingSubtitle}>{subtitle}</Text> : null}
      </Animated.View>

      <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
        <View style={styles.ageOptions}>
          {options.map((option) => (
            <BrownComponent
              key={option.value}
              type="button"
              title={option.label}
              onPress={() => onSelect(option.value)}
              selected={selectedValue === option.value}
              style={styles.ageOption}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );

  const getGoalOptions = (): { value: Goal; label: string }[] => {
    const isEducationFocus = !isAge23Plus || onboardingAnswers.focusFor === 'university';
    const options: { value: Goal; label: string }[] = [
      { value: 'habit', label: 'Build a consistent habit' },
      { value: 'longer_each_day', label: 'Study longer each day' },
      { value: 'more_days_week', label: 'Study more days per week' },
      {
        value: 'prepare_exam',
        label: isEducationFocus ? 'Prepare for an exam' : 'Prepare for an exam/cert',
      },
      { value: 'stay_focused', label: 'Stay focused / stop procrastinating' },
    ];
    if (isEducationFocus) {
      options.splice(3, 0, { value: 'improve_gpa', label: 'Improve GPA' });
    }
    return options;
  };

  const renderWelcome = () => (
    <View key="welcome" style={styles.stepContainer}>
      <Animated.View style={[styles.heroContainer, titleAnimStyle]}>
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
      </Animated.View>

      <Animated.View style={[styles.welcomeTextContainer, contentAnimStyle]}>
        <Text style={styles.welcomeTitle}>Focus Town</Text>
        <Text style={styles.welcomeSubtitle}>Build your peaceful productivity</Text>
      </Animated.View>

      <Animated.View style={buttonAnimStyle}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleStart}
        >
          <Text style={styles.primaryButtonText}>Let{"'"}s Start! 🚀</Text>
        </Pressable>
      </Animated.View>
    </View>
  );

  const renderName = () => (
    <View key="name" style={styles.onboardingStepContainer}>
      <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
        <Text style={styles.onboardingTitle}>What should we call you?</Text>
      </Animated.View>

      <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
        <BrownComponent
          type="input"
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
          maxLength={20}
        />
      </Animated.View>

      <Animated.View
        style={[styles.onboardingButtonContainer, buttonAnimStyle, { marginBottom: -56 }]}
      >
        <PrimaryButton
          title="Continue"
          onPress={handleNameContinue}
          disabled={!isValidName}
        />
      </Animated.View>
    </View>
  );

  const handleGenderSelect = (value: Gender) => {
    setGender(value);
    setTimeout(() => {
      setCurrentStep('avatar');
    }, 150);
  };

  const renderGender = () => (
    <View key="gender" style={styles.onboardingStepContainer}>
      <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
        <Text style={styles.onboardingTitle}>How do you identify?</Text>
      </Animated.View>

      <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
        <View style={styles.genderOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.genderCardShadow,
              { paddingBottom: pressed || gender === 'male' ? 5 : 8 },
            ]}
            onPress={() => handleGenderSelect('male')}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.genderCardInner,
                  { marginTop: pressed || gender === 'male' ? 3 : 0 },
                  gender === 'male' && styles.genderCardSelected,
                ]}
              >
                <Image
                  source={require('@/assets/ui/onboarding/boy.png')}
                  style={styles.genderImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.genderCardShadow,
              { paddingBottom: pressed || gender === 'female' ? 5 : 8 },
            ]}
            onPress={() => handleGenderSelect('female')}
          >
            {({ pressed }) => (
              <View
                style={[
                  styles.genderCardInner,
                  { marginTop: pressed || gender === 'female' ? 3 : 0 },
                  gender === 'female' && styles.genderCardSelected,
                ]}
              >
                <Image
                  source={require('@/assets/ui/onboarding/girl.png')}
                  style={styles.genderImage}
                  resizeMode="contain"
                />
              </View>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );

  const renderAvatar = () => (
    <View key="avatar" style={styles.onboardingStepContainer}>
      <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
        <Text style={styles.onboardingTitle}>Select an Avatar</Text>
      </Animated.View>

      <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
        <View style={styles.avatarOptions}>
          <Pressable
            style={[
              styles.avatarCard,
              avatar === 'male' && styles.avatarCardSelected,
            ]}
            onPress={() => handleAvatarSelect('male')}
          >
            <View style={styles.avatarImagePlaceholder}>
              <Text style={styles.avatarPlaceholderText}>Male</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.avatarCard,
              avatar === 'female' && styles.avatarCardSelected,
            ]}
            onPress={() => handleAvatarSelect('female')}
          >
            <View style={styles.avatarImagePlaceholder}>
              <Text style={styles.avatarPlaceholderText}>Female</Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.onboardingButtonContainer, buttonAnimStyle, { marginBottom: -56 }]}
      >
        <PrimaryButton
          title="Continue"
          onPress={handleAvatarContinue}
          disabled={!avatar}
        />
      </Animated.View>
    </View>
  );

  const renderAge = () => {
    const ageOptions = [
      '12 or under',
      '13 - 17',
      '18 - 22',
      '23 - 29',
      '30 - 40',
      '40+',
    ];

    return (
      <View key="age" style={styles.onboardingStepContainer}>
        <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
          <Text style={styles.onboardingTitle}>Age Range?</Text>
        </Animated.View>

        <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
          <View style={styles.ageOptions}>
            {ageOptions.map((option) => (
              <BrownComponent
                key={option}
                type="button"
                title={option}
                onPress={() => handleAgeSelect(option)}
                selected={ageRange === option}
                style={styles.ageOption}
              />
            ))}
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderStudyLocation = () =>
    renderOptionStep<StudyLocation>({
      title: 'Where do you usually study?',
      options: [
        { value: 'home', label: 'Home' },
        { value: 'library', label: 'Library' },
        { value: 'cafe', label: 'Cafe' },
        { value: 'school', label: 'School' },
      ],
      selectedValue: onboardingAnswers.studyLocation,
      onSelect: handleStudyLocationSelect,
    });

  const renderSocialBaseline = () =>
    renderOptionStep<SocialBaseline>({
      title: 'How often do you study with friends?',
      options: [
        { value: 'always', label: 'Always' },
        { value: 'often', label: 'Often' },
        { value: 'sometimes', label: 'Sometimes' },
        { value: 'rarely', label: 'Rarely' },
        { value: 'never', label: 'Never' },
      ],
      selectedValue: onboardingAnswers.socialBaseline,
      onSelect: handleSocialBaselineSelect,
    });

  const renderStudyFrequency = () =>
    renderOptionStep<StudyFrequency>({
      title: 'How often do you study right now?',
      options: [
        { value: 'most_days', label: 'Most days' },
        { value: 'weekdays', label: 'Weekdays' },
        { value: 'few_times_week', label: 'A few times/week' },
        { value: 'exam_only', label: 'Only before exams' },
        { value: 'not_yet', label: "I don't really study yet" },
      ],
      selectedValue: onboardingAnswers.studyFrequency,
      onSelect: handleStudyFrequencySelect,
    });

  const renderSessionLength = () =>
    renderOptionStep<SessionLength>({
      title: 'How long do you usually study in a sitting?',
      options: [
        { value: '10_25', label: '10-25 min' },
        { value: '30_60', label: '30-60 min' },
        { value: '1_2', label: '1-2 hours' },
        { value: '3_plus', label: '3+ hours' },
        { value: 'not_sure', label: 'Not sure yet' },
      ],
      selectedValue: onboardingAnswers.sessionLength,
      onSelect: handleSessionLengthSelect,
    });

  const renderFocusFriction = () =>
    renderOptionStep<FocusFriction>({
      title: 'When you study, what usually happens?',
      options: [
        { value: 'focused', label: 'I stay focused' },
        { value: 'drift', label: 'I drift sometimes' },
        { value: 'distracted', label: 'I get distracted a lot' },
        { value: 'cant_yet', label: "I can't stay focused yet" },
      ],
      selectedValue: onboardingAnswers.focusFriction,
      onSelect: handleFocusFrictionSelect,
    });

  const renderFocusFor = () =>
    renderOptionStep<FocusFor>({
      title: 'What are you focusing for?',
      options: [
        { value: 'university', label: "I'm still in university" },
        { value: 'work', label: 'Work/Company' },
        { value: 'job', label: 'Landing a Job' },
        { value: 'cert', label: 'Studying for certification' },
        { value: 'founder', label: 'Founder' },
        { value: 'other', label: 'Other' },
      ],
      selectedValue: onboardingAnswers.focusFor,
      onSelect: handleFocusForSelect,
    });

  const renderGoal = () =>
    renderOptionStep<Goal>({
      title: 'What is your main goal?',
      options: getGoalOptions(),
      selectedValue: onboardingAnswers.goal,
      onSelect: handleGoalSelect,
    });

  const renderUsername = () => {
    return (
      <View key="username" style={styles.onboardingStepContainer}>
        <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
          <Text style={styles.onboardingTitle}>Choose a username</Text>
        </Animated.View>

        <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
          <View style={styles.usernameInputContainer}>
            <BrownComponent
              ref={usernameInputRef}
              type="input"
              placeholder="username"
              value={username}
              onChangeText={handleUsernameChange}
              autoCorrect={false}
              autoCapitalize="none"
              spellCheck={false}
              maxLength={16}
              returnKeyType="next"
              returnKeyLabel="next"
              onSubmitEditing={handleUsernameContinue}
              inputStyle={styles.usernameInput}
            />
            <View style={styles.usernameAtWrapper}>
              <Text style={styles.usernameAtSymbol}>@</Text>
            </View>
            <View style={styles.usernameLabel}>
              <Text
                style={[
                  styles.usernameLabelText,
                  {
                    color: usernameError
                      ? '#C62828'
                      : isUsernameConfirmedAvailable
                      ? '#2E7D32'
                      : '#B89B4C',
                  },
                ]}
              >
                {usernameError ||
                  (isUsernameConfirmedAvailable ? 'username available' : 'username')}
              </Text>
            </View>
            {isCheckingUsername && (
              <View style={styles.usernameSpinner}>
                <ActivityIndicator size="small" color="#D1D1D1" />
              </View>
            )}
            {isUsernameConfirmedAvailable && (
              <View style={styles.usernameSpinner}>
                <Feather name="check" size={24} color="#2E7D32" />
              </View>
            )}
          </View>

          {usernameSuggestions.length > 0 && (
            <Animated.View style={styles.usernameSuggestionsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.usernameSuggestions}
                style={styles.usernameSuggestionsScroll}
              >
                {usernameSuggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    style={({ pressed }) => [
                      styles.usernameSuggestion,
                      pressed && styles.usernameSuggestionPressed,
                    ]}
                    onPress={() => handleUsernameChange(suggestion)}
                  >
                    <Text style={styles.usernameSuggestionText}>{suggestion}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View
        style={[styles.onboardingButtonContainer, buttonAnimStyle, { marginBottom: -56 }]}
        >
          <PrimaryButton
            title="Continue"
            onPress={handleUsernameContinue}
            disabled={!isUsernameAvailable || !!usernameError || isCheckingUsername}
          />
        </Animated.View>
      </View>
    );
  };

  const renderPhone = () => (
    <View key="phone" style={styles.onboardingStepContainer}>
      <Animated.View style={[styles.onboardingHeader, titleAnimStyle]}>
        <Text style={styles.onboardingTitle}>Your phone number</Text>
        <Text style={styles.onboardingSubtitle}>
          We{"'"}ll send you a verification code
        </Text>
      </Animated.View>

      <Animated.View style={[styles.onboardingContent, contentAnimStyle]}>
        <PhoneInput
          value={phoneNumber}
          onChangePhoneNumber={handlePhoneChange}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={handleCountryChange}
          defaultCountry="US"
          modalType="bottomSheet"
          initialBottomsheetHeight="90%"
          maxBottomsheetHeight="95%"
          minBottomsheetHeight="20%"
          placeholder="Phone number"
          phoneInputStyles={{
            container: styles.phoneInputContainer,
            flagContainer: styles.phoneInputFlag,
            input: styles.phoneInputText,
            caret: styles.phoneInputCaret,
          }}
          modalStyles={{
            backdrop: styles.countryModalBackdrop,
            content: styles.countryModalContent,
            dragHandleContainer: styles.countryModalHandleContainer,
            dragHandleIndicator: styles.countryModalHandleIndicator,
            container: styles.countryModal,
            list: styles.countryModalList,
            searchContainer: styles.countryModalSearchContainer,
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
          <PrimaryButton
            title="Send Code →"
            onPress={handleSendCode}
            disabled={!isPhoneValid() || isSendingCode}
            style={{ marginTop: 24 }}
          />
        )}

        {phoneAuthState.error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{phoneAuthState.error}</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );

  const renderVerify = () => (
    <View key="verify" style={styles.stepContainer}>
      <Animated.View style={[styles.header, titleAnimStyle]}>
        <Text style={styles.stepEmoji}>✉️</Text>
        <Text style={styles.stepTitle}>Enter verification code</Text>
        <Text style={styles.stepSubtitle}>
          Sent to {selectedCountry?.idd?.root}{selectedCountry?.idd?.suffixes?.[0]} {phoneNumber}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.formContainer, contentAnimStyle]}>
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
      </Animated.View>
    </View>
  );

  const renderNotifications = () => (
    <View key="notifications" style={styles.notificationStepContainer}>
      {/* Progress indicator bar */}

      <Animated.View style={[styles.notificationHeader, titleAnimStyle]}>
        <Text style={styles.notificationTitle}>Get support from{"\n"}Focustown</Text>
      </Animated.View>

      <Animated.View style={[styles.notificationPreviewContainer, contentAnimStyle]}>
        {/* Notification Preview Card */}
        <View style={styles.notificationPreviewCard}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.notificationPreviewIcon}
          />
          <View style={styles.notificationPreviewContent}>
            <View style={styles.notificationPreviewHeader}>
              <Text style={styles.notificationPreviewFrom}>From Focustown</Text>
              <Text style={styles.notificationPreviewTime}>now</Text>
            </View>
            <Text style={styles.notificationPreviewMessage}>
              Your streak is gonna be broken!
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Permission Dialog - Always visible */}
      <Animated.View style={[styles.permissionDialogContainer, contentAnimStyle]}>
        <View style={styles.permissionDialog}>
          <Text style={styles.permissionDialogTitle}>
            {"'Focustown' Would Like to Send You Notifications"}
          </Text>
          <Text style={styles.permissionDialogBody}>
            Notifications may include alerts, sounds, and icon badges. These can be configured in Settings.
          </Text>
          <View style={styles.permissionDialogDivider} />
          <View style={styles.permissionDialogButtons}>
            <Pressable
              style={styles.permissionDialogButton}
              onPress={handleNotificationDeny}
            >
              <Text style={styles.permissionDialogButtonTextDeny}>{"Don't Allow"}</Text>
            </Pressable>
            <View style={styles.permissionDialogButtonDivider} />
            <Pressable
              style={styles.permissionDialogButton}
              onPress={handleNotificationAllow}
            >
              <Text style={styles.permissionDialogButtonTextAllow}>Allow</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcome();
      case 'name':
        return renderName();
      case 'gender':
        return renderGender();
      case 'avatar':
        return renderAvatar();
      case 'age':
        return renderAge();
      case 'studyLocation':
        return renderStudyLocation();
      case 'socialBaseline':
        return renderSocialBaseline();
      case 'studyFrequency':
        return renderStudyFrequency();
      case 'sessionLength':
        return renderSessionLength();
      case 'focusFriction':
        return renderFocusFriction();
      case 'focusFor':
        return renderFocusFor();
      case 'goal':
        return renderGoal();
      case 'username':
        return renderUsername();
      case 'phone':
        return renderPhone();
      case 'verify':
        return renderVerify();
      case 'notifications':
        return renderNotifications();
      default:
        return null;
    }
  };

  // Use cream background for name/age/username steps, sky blue for others
  const isDiscordStep = currentStep === 'discord';
  const isCreamStep = [
    'name',
    'gender',
    'avatar',
    'age',
    'studyLocation',
    'socialBaseline',
    'studyFrequency',
    'sessionLength',
    'focusFriction',
    'focusFor',
    'goal',
    'username',
    'phone',
    'notifications',
  ].includes(currentStep);
  const containerStyle = isDiscordStep
    ? styles.discordScreenContainer
    : isCreamStep
    ? styles.containerCream
    : styles.container;

  const backButtonStyle = { ...styles.backButton, top: insets.top + 12 };

  // Discord step renders full-screen without wrapper
  if (isDiscordStep) {
    return (
      <View style={styles.discordScreenContainer} onTouchEnd={handleTripleTap}>
        <ImageBackground
          source={require('@/assets/ui/backgrounds/discordBackground.png')}
          style={styles.discordFullBackground}
          resizeMode="cover"
        >
          <View style={[styles.discordContent, { paddingTop: insets.top + 16 }]}>
            <Animated.View style={titleAnimStyle}>
              <Text style={styles.discordTitle}>{"Join the\nCommunity"}</Text>
            </Animated.View>

            <Animated.View style={[styles.discordBubbleWrapper, contentAnimStyle]}>
              <View style={styles.discordBubble}>
                <Text style={styles.discordBubbleText}>
                  {"\"💗 You're one of the first 1000 users! Give us feedback and shape the future of focustown\""}
                </Text>
              </View>
            </Animated.View>
          </View>

          <Animated.View style={[styles.discordActions, { paddingBottom: insets.bottom + 24 }, buttonAnimStyle]}>
            <PrimaryButton
              title="Join the Discord"
              onPress={handleJoinDiscord}
              surfaceColor="#5661EF"
              borderColor="#2E326A"
              style={styles.discordButton}
            />
            <Pressable style={styles.discordSkip} onPress={handleSkipDiscord}>
              <Text style={styles.discordSkipText}>Maybe later</Text>
            </Pressable>
          </Animated.View>
        </ImageBackground>

        <DebugModal
          visible={showDebugModal}
          onClose={() => setShowDebugModal(false)}
          onboardingStep={currentStep}
          onSetOnboardingStep={(step) => setCurrentStep(step as OnboardingStep)}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={containerStyle}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      onTouchEnd={handleTripleTap}
    >
      {currentStep !== 'notifications' && (
        <BackButton onPress={handleBack} style={backButtonStyle} />
      )}
      {/* Background clouds (hidden on name/age steps) */}
      {!isCreamStep && (
        <>
          <View style={[styles.cloud, styles.cloud1]} />
          <View style={[styles.cloud, styles.cloud2]} />
          <View style={[styles.cloud, styles.cloud3]} />
        </>
      )}

      {/* Progress bar (hidden on welcome, name, age, username steps) */}
      {currentStep !== 'welcome' && !isCreamStep && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.progressContainer, { top: insets.top + 16 }]}
        >
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, progressStyle]} />
          </View>
          <Text style={styles.progressText}>
            Step {stepIndex} of {steps.length - 1}
          </Text>
        </Animated.View>
      )}

      <View
        style={[
          styles.content,
          {
            paddingTop:
              currentStep === 'welcome'
                ? insets.top + 40
                : isCreamStep
                ? insets.top + 60
                : insets.top + 80,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {renderCurrentStep()}
      </View>

      <DebugModal
        visible={showDebugModal}
        onClose={() => setShowDebugModal(false)}
        onboardingStep={currentStep}
        onSetOnboardingStep={(step) => setCurrentStep(step as OnboardingStep)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB',
  },
  containerCream: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  discordScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
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
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 200,
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
  discordFullBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  discordContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  discordBubbleWrapper: {
    marginTop: 16,
  },
  discordTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  discordBubble: {
    marginTop: 16,
    backgroundColor: '#FFF8E7',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: '90%',
  },
  discordBubbleText: {
    fontSize: 15,
    color: '#5D4037',
    fontWeight: '600',
  },
  discordActions: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  discordButton: {
    width: '100%',
  },
  discordSkip: {
    marginTop: 12,
  },
  discordSkipText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '600',
  },
  // Reusable onboarding step styles
  onboardingStepContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  onboardingHeader: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#5D4037',
    textAlign: 'center',
  },
  onboardingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#8D6E63',
    textAlign: 'center',
    fontWeight: '600',
  },
  onboardingContent: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 0,
  },
  ageOptions: {
    gap: 14,
    marginTop: 12,
    paddingBottom: 8,
  },
  ageOption: {
    borderRadius: 20,
  },
  avatarOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  avatarCard: {
    width: 140,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#DDD5C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D4037',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarCardSelected: {
    borderColor: '#FFB347',
    borderWidth: 4,
    backgroundColor: '#FFF8E7',
  },
  avatarImagePlaceholder: {
    width: 100,
    height: 140,
    backgroundColor: '#F5EFE6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: '600',
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  genderCardShadow: {
    backgroundColor: '#C4B5A0',
    borderRadius: 24,
    paddingBottom: 8,
    borderWidth: 3,
    borderColor: '#83715B',
  },
  genderCardInner: {
    backgroundColor: '#FFEFD6',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderCardSelected: {
    backgroundColor: '#E8D9B8',
  },
  genderImage: {
    width: 120,
    height: 160,
  },
  onboardingButtonContainer: {
    paddingBottom: 40,
  },
  usernameMetaRow: {
    marginTop: 12,
    alignItems: 'center',
  },
  usernameMetaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  usernameInputContainer: {
    position: 'relative',
  },
  usernameAtWrapper: {
    position: 'absolute',
    left: 22,
    top: 22,
    zIndex: 2,
  },
  usernameAtSymbol: {
    fontSize: 26,
    color: '#B89B4C',
    fontWeight: '800',
  },
  usernameInput: {
    textAlign: 'left',
    paddingLeft: 54,
  },
  usernameLabel: {
    position: 'absolute',
    left: 22,
    top: 6,
  },
  usernameLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  usernameSpinner: {
    position: 'absolute',
    right: 18,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  usernameSuggestionsWrapper: {
    marginTop: 16,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  usernameSuggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 24,
    paddingRight: 40,
  },
  usernameSuggestionsScroll: {
    overflow: 'visible',
  },
  usernameSuggestion: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#DDD5C7',
  },
  usernameSuggestionPressed: {
    opacity: 0.8,
  },
  usernameSuggestionText: {
    fontSize: 15,
    color: '#5D4037',
    fontWeight: '700',
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
  countryModalBackdrop: {
    backgroundColor: 'transparent',
  },
  countryModalContent: {
    backgroundColor: '#FFF8E7',
  },
  countryModalHandleContainer: {
    backgroundColor: '#FFF8E7',
  },
  countryModalHandleIndicator: {
    backgroundColor: '#B89B4C',
  },
  countryModalList: {
    backgroundColor: '#FFF8E7',
  },
  countryModalSearchContainer: {
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
  // Notification step styles
  notificationStepContainer: {
    flex: 1,
  },
  notificationProgressBar: {
    height: 8,
    backgroundColor: '#E8D9C0',
    borderRadius: 4,
    marginBottom: 32,
    overflow: 'hidden',
  },
  notificationProgressFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#FFB347',
    borderRadius: 4,
  },
  notificationHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  notificationTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#5D4037',
    textAlign: 'center',
  },
  notificationPreviewContainer: {
    marginBottom: -200 ,
  },
  notificationPreviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  notificationPreviewContent: {
    flex: 1,
  },
  notificationPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notificationPreviewFrom: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  notificationPreviewTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  notificationPreviewMessage: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 18,
  },
  // Permission dialog styles
  permissionDialogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionDialog: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 14,
    width: 270,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  permissionDialogTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  permissionDialogBody: {
    fontSize: 13,
    color: '#000000',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    lineHeight: 18,
  },
  permissionDialogDivider: {
    height: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.36)',
  },
  permissionDialogButtons: {
    flexDirection: 'row',
  },
  permissionDialogButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionDialogButtonDivider: {
    width: 0.5,
    backgroundColor: 'rgba(60, 60, 67, 0.36)',
  },
  permissionDialogButtonTextDeny: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '400',
  },
  permissionDialogButtonTextAllow: {
    fontSize: 17,
    color: '#FFB347',
    fontWeight: '600',
  },
});
