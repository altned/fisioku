import { StatusBar } from 'expo-status-bar';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/root/RootNavigator';

export default function App() {
  return (
    <AppProviders>
      <RootNavigator />
      <StatusBar style="dark" />
    </AppProviders>
  );
}
