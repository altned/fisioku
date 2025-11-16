import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { TherapistsScreen } from '../screens/TherapistsScreen';
import { TherapistDetailScreen } from '../screens/TherapistDetailScreen';
import { BookingRequestScreen } from '../screens/BookingRequestScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type {
  AppStackParamList,
  AuthStackParamList,
  AppTabParamList,
} from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function AppTabsNavigator() {
  return (
    <AppTabs.Navigator screenOptions={{ headerShown: false }}>
      <AppTabs.Screen name="Home" component={HomeScreen} options={{ title: 'Beranda' }} />
      <AppTabs.Screen name="Therapists" component={TherapistsScreen} options={{ title: 'Terapis' }} />
      <AppTabs.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Booking' }} />
      <AppTabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </AppTabs.Navigator>
  );
}

export function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <AppStack.Navigator>
          <AppStack.Screen
            name="AppTabs"
            component={AppTabsNavigator}
            options={{ headerShown: false }}
          />
          <AppStack.Screen
            name="TherapistDetail"
            component={TherapistDetailScreen}
            options={{ title: 'Detail Terapis' }}
          />
          <AppStack.Screen
            name="BookingRequest"
            component={BookingRequestScreen}
            options={{ title: 'Booking Request' }}
          />
          <AppStack.Screen
            name="BookingDetail"
            component={BookingDetailScreen}
            options={{ title: 'Detail Booking' }}
          />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});
