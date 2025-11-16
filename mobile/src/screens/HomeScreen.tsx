import { useQuery } from '@tanstack/react-query';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function HomeScreen() {
  const { token } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });

  const therapistsQuery = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.therapists(token ?? '', { limit: 10 }),
    enabled: Boolean(token),
  });

  const bookingsQuery = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => api.myBookings(token ?? ''),
    enabled: Boolean(token),
  });

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Hai, {data?.patientProfile?.fullName ?? data?.therapistProfile?.fullName ?? data?.email}</Text>
        <Text style={styles.subtitle}>Role: {data?.role ?? 'Unknown'}</Text>
        {isLoading && <Text style={styles.meta}>Memuat profil...</Text>}
        {isError && <Text style={styles.error}>Gagal memuat profil</Text>}
        <Text style={styles.meta}>Kelola booking Anda melalui tab di bawah.</Text>
      </View>
      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Terapis Unggulan</Text>
        {therapistsQuery.isLoading && <Text style={styles.meta}>Memuat daftar terapis...</Text>}
        {therapistsQuery.isError && <Text style={styles.error}>Gagal memuat terapis.</Text>}
        {therapistsQuery.data ? (
          <FlatList
            data={therapistsQuery.data.data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.therapistItem}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.therapistName}>{item.fullName}</Text>
                  <Text style={styles.therapistMeta}>
                    {item.city ?? 'Lokasi tidak tersedia'} • {item.specialties.join(', ') || 'Bidang belum diisi'}
                  </Text>
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={<Text style={styles.meta}>Belum ada terapis aktif.</Text>}
          />
        ) : null}
      </View>
      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Booking Terbaru</Text>
        {bookingsQuery.isLoading && <Text style={styles.meta}>Memuat booking...</Text>}
        {bookingsQuery.data && bookingsQuery.data.length === 0 && <Text style={styles.meta}>Belum ada booking tercatat.</Text>}
        {bookingsQuery.data ? (
          <FlatList
            data={bookingsQuery.data.slice(0, 5)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.bookingItem}>
                <Text style={styles.bookingTitle}>{item.package.name}</Text>
                <Text style={styles.meta}>{item.therapist.fullName}</Text>
                <Text style={styles.meta}>{new Date(item.preferredSchedule).toLocaleString('id-ID')}</Text>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
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
  listCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0f172a',
  },
  therapistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
  },
  therapistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  therapistMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  bookingItem: {
    paddingVertical: 8,
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusPill: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '600',
  },
});
