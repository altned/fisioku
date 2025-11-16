import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function ProfileScreen() {
  const { logout, token } = useAuth();
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{data?.patientProfile?.fullName ?? data?.therapistProfile?.fullName ?? data?.email}</Text>
        <Text style={styles.meta}>Role: {data?.role ?? 'UNKNOWN'}</Text>
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
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 14, color: '#475569' },
  button: {
    marginTop: 8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
