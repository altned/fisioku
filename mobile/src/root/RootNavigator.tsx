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
import { TherapistBookingsScreen } from '../screens/TherapistBookingsScreen';
import { BookingDetailScreen } from '../screens/BookingDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ReviewScreen } from '../screens/ReviewScreen';
import { SessionNoteScreen } from '../screens/SessionNoteScreen';
import { TherapistAvailabilityScreen } from '../screens/TherapistAvailabilityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type {
  AppStackParamList,
  AuthStackParamList,
  AppTabParamList,
} from '../types/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function AppTabsNavigator({ role }: { role?: string }) {
  const isTherapist = role === 'THERAPIST';
  return (
    <AppTabs.Navigator screenOptions={{ headerShown: false }}>
      <AppTabs.Screen name="Home" component={HomeScreen} options={{ title: 'Beranda' }} />
      {!isTherapist && (
        <AppTabs.Screen
          name="Therapists"
          component={TherapistsScreen}
          options={{ title: 'Terapis' }}
        />
      )}
      {isTherapist ? (
        <AppTabs.Screen
          name="Assigned"
          component={TherapistBookingsScreen}
          options={{ title: 'Tugas' }}
        />
      ) : (
        <AppTabs.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Booking' }} />
      )}
      <AppTabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </AppTabs.Navigator>
  );
}

export function RootNavigator() {
  const { token, loading } = useAuth();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });

  if (loading || meQuery.isLoading) {
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
            options={{ headerShown: false }}
          >
            {() => <AppTabsNavigator role={meQuery.data?.role} />}
          </AppStack.Screen>
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
          <AppStack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: 'Percakapan' }}
          />
          <AppStack.Screen
            name="Review"
            component={ReviewScreen}
            options={{ title: 'Tulis Review' }}
          />
          <AppStack.Screen
            name="SessionNote"
            component={SessionNoteScreen}
            options={{ title: 'Catatan Sesi' }}
          />
          <AppStack.Screen
            name="TherapistAvailability"
            component={TherapistAvailabilityScreen}
            options={{ title: 'Ketersediaan Terapis' }}
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
