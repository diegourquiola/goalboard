import * as Haptics from 'expo-haptics';

export const hapticSelect  = () => Haptics.selectionAsync();
export const hapticLight   = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
export const hapticSuccess = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
