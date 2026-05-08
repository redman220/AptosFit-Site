import { Platform } from 'react-native';
import * as ExpoHaptics from 'expo-haptics';

// Web-safe haptics wrapper
export const Haptics = {
  notificationAsync: async (type?: ExpoHaptics.NotificationFeedbackType) => {
    if (Platform.OS === 'web') {
      // On web, we can't do haptic feedback, so just return
      return Promise.resolve();
    }
    return ExpoHaptics.notificationAsync(
      type || ExpoHaptics.NotificationFeedbackType.Success
    );
  },

  impactAsync: async (style?: ExpoHaptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'web') {
      return Promise.resolve();
    }
    return ExpoHaptics.impactAsync(
      style || ExpoHaptics.ImpactFeedbackStyle.Medium
    );
  },

  selectionAsync: async () => {
    if (Platform.OS === 'web') {
      return Promise.resolve();
    }
    return ExpoHaptics.selectionAsync();
  },

  NotificationFeedbackType: ExpoHaptics.NotificationFeedbackType,
  ImpactFeedbackStyle: ExpoHaptics.ImpactFeedbackStyle,
};
