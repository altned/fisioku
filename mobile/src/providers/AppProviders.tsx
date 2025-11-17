import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { NotificationRegistrar } from '../components/NotificationRegistrar';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <NotificationRegistrar />
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
