import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import StandingsScreen from './src/screens/StandingsScreen';
import MatchesScreen   from './src/screens/MatchesScreen';
import TrendsScreen    from './src/screens/TrendsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Standings: focused ? 'list'      : 'list-outline',
              Matches:   focused ? 'football'  : 'football-outline',
              Trends:    focused ? 'bar-chart' : 'bar-chart-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor:   '#2563EB',
          tabBarInactiveTintColor: '#9CA3AF',
          headerShown: true,
        })}
      >
        <Tab.Screen name="Standings" component={StandingsScreen} />
        <Tab.Screen name="Matches"   component={MatchesScreen} />
        <Tab.Screen name="Trends"    component={TrendsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
