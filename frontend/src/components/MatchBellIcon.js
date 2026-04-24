import React from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useMatchSubscription } from '../hooks/useMatchSubscription';

export default function MatchBellIcon({ match, size = 20, style }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const { subscribed, toggle, loading } = useMatchSubscription(match);

  async function handlePress() {
    if (!user) {
      navigation.navigate('Auth');
      return;
    }
    await toggle();
  }

  if (loading) {
    return <ActivityIndicator size="small" color={colors.accent} style={style} />;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={style}
    >
      <Ionicons
        name={subscribed ? 'notifications' : 'notifications-off-outline'}
        size={size}
        color={subscribed ? colors.accent : colors.mutedForeground}
      />
    </TouchableOpacity>
  );
}
