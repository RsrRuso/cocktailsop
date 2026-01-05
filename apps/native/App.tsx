
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import Home from './src/screens/Home';
import Explore from './src/screens/Explore';
import Create from './src/screens/Create';
import Reels from './src/screens/Reels';
import Messages from './src/screens/Messages';
import Profile from './src/screens/Profile';
import { AppProvider } from './src/state';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AuthScreen from './src/screens/Auth';
import RoutesScreen from './src/screens/Routes';
import WebRouteScreen from './src/screens/WebRoute';
import { queryClient } from './src/lib/queryClient';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppShell() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <AuthScreen />;
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Tabs"
          component={Tabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WebRoute"
          component={WebRouteScreen as any}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0b1220', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#9aa4b2',
      }}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Explore" component={Explore} />
      <Tab.Screen name="Create" component={Create} />
      <Tab.Screen name="Reels" component={Reels} />
      <Tab.Screen name="Messages" component={Messages} />
      <Tab.Screen name="Profile" component={Profile} />
      <Tab.Screen name="Routes" component={RoutesScreen as any} />
    </Tab.Navigator>
  );
}

export default function App(){
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppProvider>
            <AppShell />
            <StatusBar style="light" />
          </AppProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
