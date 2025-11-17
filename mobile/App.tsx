import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/root/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppProviders>
  );
}
