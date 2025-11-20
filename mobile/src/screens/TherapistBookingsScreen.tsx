import { useCallback, useMemo, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type BookingResponse } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { AppStackParamList } from '../types/navigation';

const STATUS_FILTERS: Array<{ label: string; value?: string }> = [
  { label: 'Semua', value: undefined },
  { label: 'Perlu Aksi', value: 'WAITING_THERAPIST_CONFIRM' },
  { label: 'Menunggu Bayar', value: 'PAYMENT_PENDING' },
  { label: 'Verifikasi Admin', value: 'WAITING_ADMIN_VERIFY_PAYMENT' },
  { label: 'Berjalan', value: 'IN_PROGRESS' },
  { label: 'Selesai', value: 'COMPLETED' },
];

export function TherapistBookingsScreen() {
  const { token } = useAuth();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [scheduleState, setScheduleState] = useState<{
    bookingId: string;
    sessionId: string;
  } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  const {
    data: bookings,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['assignedBookings', statusFilter ?? 'ALL'],
    queryFn: () =>
      api.myTherapistBookings(
        token ?? '',
        statusFilter ? { status: statusFilter } : undefined,
      ),
    enabled: Boolean(token),
  });

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      void refetch();
    }, [refetch, token]),
  );

  const confirmMutation = useMutation({
    mutationFn: (payload: { bookingId: string; accept: boolean }) =>
      api.confirmBookingAsTherapist(
        token ?? '',
        payload.bookingId,
        payload.accept,
      ),
    onSuccess: (_data, variables) => {
      Alert.alert(
        'Berhasil',
        variables.accept
          ? 'Booking berhasil diterima.'
          : 'Booking berhasil ditolak.',
      );
      void queryClient.invalidateQueries({ queryKey: ['assignedBookings'] });
    },
    onError: (error) => {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Terjadi kesalahan',
      );
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (payload: { sessionId: string; scheduledAt: string }) =>
      api.scheduleSession(token ?? '', payload.sessionId, payload.scheduledAt),
    onSuccess: () => {
      Alert.alert('Sukses', 'Jadwal sesi berhasil diperbarui.');
      void queryClient.invalidateQueries({ queryKey: ['assignedBookings'] });
    },
    onError: (error) => {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Terjadi kesalahan',
      );
    },
  });

  const filteredBookings = bookings ?? [];

  const nextSessionForBooking = (booking: BookingResponse) =>
    booking.sessions.find((session) => session.status !== 'COMPLETED');

  const openSchedulePicker = (
    bookingId: string,
    sessionId: string,
    current?: string | null,
  ) => {
    setScheduleState({ bookingId, sessionId });
    setScheduleDate(current ? new Date(current) : new Date());
    setShowSchedulePicker(true);
  };

  const handleScheduleChange = (_event: unknown, selected?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowSchedulePicker(false);
    }
    if (selected) {
      setScheduleDate(selected);
    }
  };

  const submitSchedule = async () => {
    if (!scheduleState) {
      return;
    }
    await scheduleMutation.mutateAsync({
      sessionId: scheduleState.sessionId,
      scheduledAt: scheduleDate.toISOString(),
    });
    setShowSchedulePicker(false);
    setScheduleState(null);
  };

  const statusSummary = useMemo(() => {
    const total = filteredBookings.length;
    const awaiting = filteredBookings.filter(
      (booking) => booking.status === 'WAITING_THERAPIST_CONFIRM',
    ).length;
    return { total, awaiting };
  }, [filteredBookings]);

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Booking Anda</Text>
          <Text style={styles.bannerMeta}>
            {statusSummary.awaiting} perlu aksi • {statusSummary.total} total
          </Text>
        </View>
        <TouchableOpacity
          style={styles.bannerButton}
          onPress={() => navigation.navigate('TherapistAvailability')}
        >
          <Text style={styles.bannerButtonText}>Atur Slot</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => {
          const active = filter.value === statusFilter;
          return (
            <TouchableOpacity
              key={filter.label}
              onPress={() => setStatusFilter(filter.value)}
              style={[
                styles.filterChip,
                active ? styles.filterChipActive : undefined,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active ? styles.filterTextActive : undefined,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => void refetch()}
          />
        }
        renderItem={({ item }) => {
          const nextSession = nextSessionForBooking(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.package.name}</Text>
                <Text style={styles.statusPill}>{item.status}</Text>
              </View>
              <Text style={styles.metaText}>
                Pasien: {item.patient.fullName ?? item.patient.email}
              </Text>
              <Text style={styles.metaText}>
                Jadwal permintaan:{' '}
                {new Date(item.preferredSchedule).toLocaleString('id-ID')}
              </Text>
              {nextSession ? (
                <Text style={styles.metaText}>
                  Sesi berikutnya:{' '}
                  {nextSession.scheduledAt
                    ? new Date(nextSession.scheduledAt).toLocaleString('id-ID')
                    : 'Belum dijadwalkan'}
                </Text>
              ) : null}
              <View style={styles.actions}>
                {item.status === 'WAITING_THERAPIST_CONFIRM' ? (
                  <View style={styles.rowActions}>
                    <TouchableOpacity
                      style={styles.primaryAction}
                      onPress={() =>
                        confirmMutation.mutate({
                          bookingId: item.id,
                          accept: true,
                        })
                      }
                      disabled={confirmMutation.isPending}
                    >
                      <Text style={styles.primaryActionText}>Terima</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dangerAction}
                      onPress={() =>
                        confirmMutation.mutate({
                          bookingId: item.id,
                          accept: false,
                        })
                      }
                      disabled={confirmMutation.isPending}
                    >
                      <Text style={styles.dangerActionText}>Tolak</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {nextSession ? (
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() =>
                      openSchedulePicker(
                        item.id,
                        nextSession.id,
                        nextSession.scheduledAt ?? item.preferredSchedule,
                      )
                    }
                    disabled={scheduleMutation.isPending}
                  >
                    <Text style={styles.secondaryActionText}>
                      {nextSession.scheduledAt
                        ? 'Ubah Jadwal'
                        : 'Atur Jadwal'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.rowActions}>
                  <TouchableOpacity
                    style={styles.secondaryAction}
                    onPress={() =>
                      navigation.navigate('BookingDetail', { booking: item })
                    }
                  >
                    <Text style={styles.secondaryActionText}>Detail</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() =>
                      navigation.navigate('Chat', { bookingId: item.id })
                    }
                  >
                    <Text style={styles.primaryActionText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.metaText}>
              Belum ada booking di filter ini.
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {showSchedulePicker ? (
        <View style={styles.schedulePicker}>
          <DateTimePicker
            value={scheduleDate}
            mode="datetime"
            onChange={handleScheduleChange}
          />
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              disabled={scheduleMutation.isPending}
              onPress={submitSchedule}
            >
              <Text style={styles.secondaryActionText}>
                {scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dangerAction}
              onPress={() => {
                setShowSchedulePicker(false);
                setScheduleState(null);
              }}
              disabled={scheduleMutation.isPending}
            >
              <Text style={styles.dangerActionText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fd',
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  bannerMeta: {
    fontSize: 13,
    color: '#475569',
  },
  bannerButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  bannerButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  filterText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#312e81',
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 13,
    color: '#475569',
  },
  actions: {
    marginTop: 12,
    gap: 8,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    color: '#fff',
    fontWeight: '600',
  },
  dangerAction: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  dangerActionText: {
    color: '#991b1b',
    fontWeight: '600',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  schedulePicker: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
});
