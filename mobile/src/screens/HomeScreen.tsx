import { useQuery } from '@tanstack/react-query';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function HomeScreen() {
  const { token, logout } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Hai, {data?.patientProfile?.fullName ?? data?.therapistProfile?.fullName ?? data?.email}</Text>
        <Text style={styles.subtitle}>Role: {data?.role ?? 'Unknown'}</Text>
        {isLoading && <Text style={styles.meta}>Memuat profil...</Text>}
        {isError && <Text style={styles.error}>Gagal memuat profil</Text>}
        <Text style={styles.meta}>Token tersimpan aman di perangkat.</Text>
        <TouchableOpacity style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Keluar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
  },
  error: {
    fontSize: 14,
    color: '#ef4444',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
