import { useQuery } from '@tanstack/react-query';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export function HomeScreen() {
  const { token } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });

  const isTherapist = data?.role === 'THERAPIST';

  const therapistsQuery = useQuery({
    queryKey: ['therapists'],
    queryFn: () => api.therapists(token ?? '', { limit: 10 }),
    enabled: Boolean(token) && !isTherapist,
  });

  const bookingsQuery = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => api.myBookings(token ?? ''),
    enabled: Boolean(token) && !isTherapist,
  });

  const assignedBookingsQuery = useQuery({
    queryKey: ['assignedBookings', 'home'],
    queryFn: () => api.myTherapistBookings(token ?? ''),
    enabled: Boolean(token) && isTherapist,
  });

  const revenueQuery = useQuery({
    queryKey: ['therapist-revenue-home'],
    queryFn: async () => {
      const response = await api.myTherapistBookings(token ?? '');
      return response.reduce((total, booking) => {
        const share = booking.payment?.therapistShareAmount;
        return total + (share ? Number(share) : 0);
      }, 0);
    },
    enabled: Boolean(token) && isTherapist,
  });

  const assignedBookings = assignedBookingsQuery.data ?? [];
  const nextBooking = assignedBookings.length ? assignedBookings[0] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>
          Hai,{' '}
          {data?.patientProfile?.fullName ??
            data?.therapistProfile?.fullName ??
            data?.email}
        </Text>
        <Text style={styles.subtitle}>Role: {data?.role ?? 'Unknown'}</Text>
        {isLoading && <Text style={styles.meta}>Memuat profil...</Text>}
        {isError && <Text style={styles.error}>Gagal memuat profil</Text>}
        {isTherapist ? (
          <Text style={styles.meta}>
            Pantau booking yang ditugaskan dan atur ketersediaan Anda pada tab
            Bookings.
          </Text>
        ) : (
          <Text style={styles.meta}>
            Kelola booking Anda melalui tab di bawah.
          </Text>
        )}
      </View>
      {isTherapist ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Dashboard Terapis</Text>
              <Text style={styles.meta}>Pantau booking dan pendapatan Anda.</Text>
            </View>
            <Text style={styles.heroBadge}>
              {assignedBookingsQuery.data?.length ?? 0} booking aktif
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.sectionTitle}>Pendapatan diverifikasi</Text>
              <Text style={styles.meta}>Bagi hasil yang sudah masuk</Text>
              <Text style={styles.statValue}>
                {revenueQuery.isLoading
                  ? '...'
                  : new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(revenueQuery.data ?? 0)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.sectionTitle}>Booking terdekat</Text>
              {nextBooking ? (
                <View>
                  <Text style={styles.inlineHighlight}>
                    {nextBooking.package.name}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(nextBooking.preferredSchedule).toLocaleString('id-ID')}
                  </Text>
                </View>
              ) : (
                <Text style={styles.meta}>Belum ada jadwal</Text>
              )}
            </View>
          </View>
          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Daftar Booking</Text>
            {assignedBookingsQuery.isLoading && (
              <Text style={styles.meta}>Memuat booking...</Text>
            )}
            {assignedBookingsQuery.data && assignedBookingsQuery.data.length === 0 && (
              <Text style={styles.meta}>
                Belum ada booking ditugaskan. Tambahkan availability untuk
                menerima pasien.
              </Text>
            )}
            {assignedBookings.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.bookingItem}>
                <View>
                  <Text style={styles.bookingTitle}>{item.package.name}</Text>
                  <Text style={styles.meta}>
                    {new Date(item.preferredSchedule).toLocaleString('id-ID')}
                  </Text>
                </View>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>
            ))}
          </View>
          <View style={styles.tipCard}>
            <Text style={styles.sectionTitle}>Tips Terapis</Text>
            <Text style={styles.meta}>
              Gunakan tab Tugas untuk menyetujui permintaan dan hubungi pasien melalui chat.
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Terapis Unggulan</Text>
            {therapistsQuery.isLoading && (
              <Text style={styles.meta}>Memuat daftar terapis...</Text>
            )}
            {therapistsQuery.isError && (
              <Text style={styles.error}>Gagal memuat terapis.</Text>
            )}
            {therapistsQuery.data ? (
              therapistsQuery.data.data.slice(0, 5).map((item) => (
                <View key={item.id} style={styles.therapistItem}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {item.fullName.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.therapistName}>{item.fullName}</Text>
                    <Text style={styles.therapistMeta}>
                      {item.city ?? 'Lokasi tidak tersedia'} •{' '}
                      {item.specialties.join(', ') || 'Bidang belum diisi'}
                    </Text>
                  </View>
                </View>
              ))
            ) : null}
          </View>
          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Booking Terbaru</Text>
            {bookingsQuery.isLoading && (
              <Text style={styles.meta}>Memuat booking...</Text>
            )}
            {bookingsQuery.data && bookingsQuery.data.length === 0 && (
              <Text style={styles.meta}>Belum ada booking tercatat.</Text>
            )}
            {bookingsQuery.data?.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.bookingItem}>
                <Text style={styles.bookingTitle}>{item.package.name}</Text>
                <Text style={styles.meta}>{item.therapist.fullName}</Text>
                <Text style={styles.meta}>
                  {new Date(item.preferredSchedule).toLocaleString('id-ID')}
                </Text>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef2ff',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
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
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0f172a',
  },
  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  heroBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: '#10b981',
    color: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    fontWeight: '600',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  statValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  inlineHighlight: {
    fontSize: 15,
    fontWeight: '600',
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
