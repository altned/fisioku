import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  api,
  uploadPaymentProofFile,
  type BookingResponse,
} from '../api/client';
import type { AppStackParamList } from '../types/navigation';

export function BookingsScreen() {
  const { token } = useAuth();
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });
  const isTherapist = meQuery.data?.role === 'THERAPIST';
  const bookingsQuery = useQuery({
    queryKey: [isTherapist ? 'assignedBookings' : 'myBookings'],
    queryFn: () =>
      isTherapist
        ? api.myTherapistBookings(token ?? '')
        : api.myBookings(token ?? ''),
    enabled: Boolean(token) && Boolean(meQuery.data),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      api.cancelBooking(token ?? '', bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (payload: { bookingId: string; accept: boolean }) =>
      api.confirmBookingAsTherapist(
        token ?? '',
        payload.bookingId,
        payload.accept,
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['assignedBookings'] }),
  });
  const scheduleMutation = useMutation({
    mutationFn: (payload: { sessionId: string; scheduledAt: string }) =>
      api.scheduleSession(token ?? '', payload.sessionId, payload.scheduledAt),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['assignedBookings'] }),
  });
  const [scheduleState, setScheduleState] = useState<{
    bookingId: string;
    sessionId: string;
  } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);

  const handleUploadProof = async (bookingId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    try {
      const { fileId } = await uploadPaymentProofFile(
        token ?? '',
        result.assets[0],
      );
      await api.uploadBookingProof(token ?? '', bookingId, fileId);
      Alert.alert('Sukses', 'Bukti pembayaran berhasil dikirim.');
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    } catch (error) {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Terjadi kesalahan',
      );
    }
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert('Batalkan Booking', 'Yakin ingin membatalkan?', [
      { text: 'Tidak' },
      {
        text: 'Ya',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(bookingId),
      },
    ]);
  };

  const handleConfirm = (bookingId: string, accept: boolean) => {
    confirmMutation.mutate({ bookingId, accept });
  };

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
    if (!scheduleState) return;
    try {
      await scheduleMutation.mutateAsync({
        sessionId: scheduleState.sessionId,
        scheduledAt: scheduleDate.toISOString(),
      });
      Alert.alert('Sukses', 'Jadwal sesi diperbarui.');
    } catch (error) {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Terjadi kesalahan',
      );
    } finally {
      setShowSchedulePicker(false);
      setScheduleState(null);
    }
  };

  const renderPatientActions = (booking: BookingResponse) => {
    const actions: React.ReactNode[] = [];
    if (booking.status === 'PAYMENT_PENDING') {
      actions.push(
        <TouchableOpacity
          key="upload"
          style={styles.actionButton}
          onPress={() => handleUploadProof(booking.id)}
        >
          <Text style={styles.actionText}>Upload Bukti</Text>
        </TouchableOpacity>,
      );
    }
    if (
      ['WAITING_THERAPIST_CONFIRM', 'PAYMENT_PENDING', 'WAITING_ADMIN_VERIFY_PAYMENT'].includes(
        booking.status,
      )
    ) {
      actions.push(
        <TouchableOpacity
          key="cancel"
          style={styles.actionDanger}
          onPress={() => handleCancel(booking.id)}
        >
          <Text style={styles.actionDangerText}>Batalkan</Text>
        </TouchableOpacity>,
      );
    }
    actions.push(
      <TouchableOpacity
        key="detail"
        style={styles.actionSecondary}
        onPress={() => stackNavigation.navigate('BookingDetail', { booking })}
      >
        <Text style={styles.actionText}>Detail</Text>
      </TouchableOpacity>,
    );
    actions.push(
      <TouchableOpacity
        key="chat"
        style={styles.actionButton}
        onPress={() => stackNavigation.navigate('Chat', { bookingId: booking.id })}
      >
        <Text style={styles.actionText}>Chat</Text>
      </TouchableOpacity>,
    );
    return actions;
  };

  const renderTherapistActions = (booking: BookingResponse) => {
    const nextSession = booking.sessions.find(
      (session) => session.status !== 'COMPLETED',
    );
    return (
      <View style={styles.therapistActions}>
        {booking.status === 'WAITING_THERAPIST_CONFIRM' ? (
          <View style={styles.rowActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleConfirm(booking.id, true)}
              disabled={confirmMutation.isPending}
            >
              <Text style={styles.actionText}>Terima</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionDanger}
              onPress={() => handleConfirm(booking.id, false)}
              disabled={confirmMutation.isPending}
            >
              <Text style={styles.actionDangerText}>Tolak</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {nextSession ? (
          <TouchableOpacity
            style={styles.actionSecondary}
            onPress={() =>
              openSchedulePicker(
                booking.id,
                nextSession.id,
                nextSession.scheduledAt ?? booking.preferredSchedule,
              )
            }
            disabled={scheduleMutation.isPending}
          >
            <Text style={styles.actionText}>
              {nextSession.scheduledAt ? 'Ubah Jadwal' : 'Atur Jadwal'}
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => stackNavigation.navigate('Chat', { bookingId: booking.id })}
        >
          <Text style={styles.actionText}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookingsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={bookingsQuery.isFetching}
            onRefresh={() => bookingsQuery.refetch()}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.bookingTitle}>{item.package.name}</Text>
            <Text style={styles.meta}>
              {isTherapist
                ? `Pasien: ${item.patient.fullName ?? item.patient.email}`
                : item.therapist.fullName}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.preferredSchedule).toLocaleString('id-ID')}
            </Text>
            <Text style={styles.statusPill}>{item.status}</Text>
            <View style={styles.actions}>
              {isTherapist
                ? renderTherapistActions(item)
                : renderPatientActions(item)}
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.meta}>Belum ada booking.</Text>
          </View>
        )}
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
              style={styles.actionSecondary}
              onPress={submitSchedule}
              disabled={scheduleMutation.isPending}
            >
              <Text style={styles.actionText}>
                {scheduleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionDanger}
              onPress={() => {
                setShowSchedulePicker(false);
                setScheduleState(null);
              }}
            >
              <Text style={styles.actionDangerText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  bookingTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#475569' },
  statusPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#312e81',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: { flexDirection: 'column', gap: 8, marginTop: 10 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1d4ed8',
  },
  actionSecondary: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
  },
  actionDanger: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fee2e2',
  },
  actionText: { color: '#fff', fontWeight: '600' },
  actionDangerText: { color: '#991b1b', fontWeight: '600' },
  therapistActions: { gap: 8 },
  schedulePicker: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
});
