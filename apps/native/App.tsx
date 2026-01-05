
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
import PostDetailScreen from './src/screens/PostDetail';
import NotificationsScreen from './src/screens/Notifications';
import UserProfileScreen from './src/screens/UserProfile';
import MessageThreadScreen from './src/screens/MessageThread';
import ReelDetailScreen from './src/screens/ReelDetail';
import OpsScreen from './src/screens/Ops';
import InventoryManagerScreen from './src/screens/InventoryManager';
import AllInventoryScreen from './src/screens/AllInventory';
import InventoryTransactionsScreen from './src/screens/InventoryTransactions';
import MasterItemsScreen from './src/screens/MasterItems';
import StoreManagementScreen from './src/screens/StoreManagement';
import StoreDetailScreen from './src/screens/StoreDetail';
import FifoWorkspaceManagementScreen from './src/screens/FifoWorkspaceManagement';
import FifoActivityLogScreen from './src/screens/FifoActivityLog';
import FifoPinAccessScreen from './src/screens/FifoPinAccess';
import FifoScanAccessScreen from './src/screens/FifoScanAccess';
import FifoAccessApprovalScreen from './src/screens/FifoAccessApproval';
import FifoQRAccessCodeScreen from './src/screens/FifoQRAccessCode';
import FifoQrScannerScreen from './src/screens/FifoQrScanner';
import FifoMemberManagerScreen from './src/screens/FifoMemberManager';
import PurchaseOrdersScreen from './src/screens/PurchaseOrders';
import POMasterItemsScreen from './src/screens/POMasterItems';
import POReceivedItemsScreen from './src/screens/POReceivedItems';
import ProcurementPinAccessScreen from './src/screens/ProcurementPinAccess';
import ProcurementStaffManagerScreen from './src/screens/ProcurementStaffManager';
import POReceivedRecordDetailScreen from './src/screens/POReceivedRecordDetail';
import POVarianceReportScreen from './src/screens/POVarianceReport';
import ProcurementAnalyticsScreen from './src/screens/ProcurementAnalytics';
import BatchCalculatorScreen from './src/screens/BatchCalculator';
import BatchRecipesScreen from './src/screens/BatchRecipes';
import BatchViewScreen from './src/screens/BatchView';
import BatchPinAccessScreen from './src/screens/BatchPinAccess';
import ReportsHubScreen from './src/screens/ReportsHub';
import ProfitLossReportScreen from './src/screens/ProfitLossReport';

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
          name="PostDetail"
          component={PostDetailScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MessageThread"
          component={MessageThreadScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReelDetail"
          component={ReelDetailScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InventoryManager"
          component={InventoryManagerScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AllInventory"
          component={AllInventoryScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="InventoryTransactions"
          component={InventoryTransactionsScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MasterItems"
          component={MasterItemsScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StoreManagement"
          component={StoreManagementScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StoreDetail"
          component={StoreDetailScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoWorkspaceManagement"
          component={FifoWorkspaceManagementScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoActivityLog"
          component={FifoActivityLogScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoPinAccess"
          component={FifoPinAccessScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoScanAccess"
          component={FifoScanAccessScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoAccessApproval"
          component={FifoAccessApprovalScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoQRAccessCode"
          component={FifoQRAccessCodeScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoQrScanner"
          component={FifoQrScannerScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="FifoMemberManager"
          component={FifoMemberManagerScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="PurchaseOrders"
          component={PurchaseOrdersScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="POMasterItems"
          component={POMasterItemsScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="POReceivedItems"
          component={POReceivedItemsScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProcurementPinAccess"
          component={ProcurementPinAccessScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProcurementStaffManager"
          component={ProcurementStaffManagerScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="POReceivedRecordDetail"
          component={POReceivedRecordDetailScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="POVarianceReport"
          component={POVarianceReportScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProcurementAnalytics"
          component={ProcurementAnalyticsScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BatchCalculator"
          component={BatchCalculatorScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BatchPinAccess"
          component={BatchPinAccessScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BatchRecipes"
          component={BatchRecipesScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="BatchView"
          component={BatchViewScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ReportsHub"
          component={ReportsHubScreen as any}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProfitLossReport"
          component={ProfitLossReportScreen as any}
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

function Tabs({ navigation }: { navigation: any }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0b1220', borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#9aa4b2',
      }}
    >
      <Tab.Screen name="Home">
        {() => <Home navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Explore">
        {() => <Explore navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Create" component={Create} />
      <Tab.Screen name="Reels">
        {() => <Reels navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Messages">
        {() => <Messages navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Notifications">
        {() => <NotificationsScreen navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <Profile navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen name="Ops">
        {() => <OpsScreen navigation={navigation} />}
      </Tab.Screen>
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
