import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import LeaguesListScreen from './LeaguesListScreen';
import LeagueDetailScreen from './LeagueDetailScreen';

const logo = require('../../assets/logo.png');

export default function LeaguesTab({ navigation }) {
  const { colors, isDark, toggle } = useTheme();
  const [selectedLeague, setSelectedLeague] = useState(null);

  useEffect(() => {
    if (selectedLeague) {
      // League detail header: league logo + back button + theme toggle
      navigation.setOptions({
        headerTitle: () => (
          <Image source={{ uri: selectedLeague.logo }} style={styles.leagueLogo} resizeMode="contain" />
        ),
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => setSelectedLeague(null)}
            style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginLeft: 8 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={toggle}
            style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginRight: 20 }]}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.foreground} />
          </TouchableOpacity>
        ),
      });
    } else {
      // Leagues list header: app logo + name + theme toggle
      navigation.setOptions({
        headerLeft: () => null,
        headerTitle: () => (
          <View style={styles.appHeader}>
            <Image source={logo} style={styles.appLogo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.foreground }]}>GoalBoard</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity
            onPress={toggle}
            style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginRight: 20 }]}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.foreground} />
          </TouchableOpacity>
        ),
      });
    }
  }, [selectedLeague, colors, isDark]);

  if (selectedLeague) {
    return <LeagueDetailScreen league={selectedLeague} />;
  }

  return <LeaguesListScreen onSelect={setSelectedLeague} />;
}

const styles = StyleSheet.create({
  appHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo:    { width: 32, height: 32, borderRadius: 8 },
  appName:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  leagueLogo: { width: 36, height: 36 },
  iconBtn:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
