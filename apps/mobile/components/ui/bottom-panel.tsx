import { ReactNode } from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle } from 'react-native';

interface Tab<T extends string> {
  key: T;
  label: string;
}

interface BottomPanelProps<T extends string> {
  children: ReactNode;
  tabs?: Tab<T>[];
  activeTab?: T;
  onTabChange?: (tab: T) => void;
  contentStyle?: ViewStyle;
}

/**
 * Reusable bottom panel with brown shadow border and optional tabs.
 * Used for store, character customization, and similar screens.
 */
export function BottomPanel<T extends string>({
  children,
  tabs,
  activeTab,
  onTabChange,
  contentStyle,
}: BottomPanelProps<T>) {
  return (
    <View style={styles.panelShadow}>
      <View style={[styles.innerPanel, contentStyle]}>
        {tabs && tabs.length > 0 && (
          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => onTabChange?.(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panelShadow: {
    flex: 1,
    backgroundColor: '#C4B5A0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingBottom: 12,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: '#83715B',
    marginHorizontal: 3,
    borderRadius: 32,
    marginBottom: 2,
  },
  innerPanel: {
    flex: 1,
    backgroundColor: '#FFEFD6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    borderRadius: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#F5EFE6',
    borderRadius: 24,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#E8DDD0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A89880',
  },
  tabTextActive: {
    color: '#5A4A3A',
  },
});
