import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, uploadPaymentProofFile, type BookingSummary } from '../api/client';
import type { AppStackParamList } from '../types/navigation';

export function BookingsScreen() {
  const { token } = useAuth();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const bookingsQuery = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => api.myBookings(token ?? ''),
    enabled: Boolean(token),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.cancelBooking(token ?? '', bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });

  const handleUploadProof = async (bookingId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    try {
      const { fileId } = await uploadPaymentProofFile(token ?? '', result.assets[0]);
      await api.uploadBookingProof(token ?? '', bookingId, fileId);
      Alert.alert('Sukses', 'Bukti pembayaran berhasil dikirim.');
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Terjadi kesalahan');
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

  const renderStatusActions = (booking: BookingSummary) => {
    const actions: React.ReactNode[] = [];
    if (booking.status === 'PAYMENT_PENDING') {
      actions.push(
        <TouchableOpacity key="upload" style={styles.actionButton} onPress={() => handleUploadProof(booking.id)}>
          <Text style={styles.actionText}>Upload Bukti</Text>
        </TouchableOpacity>,
      );
    }
    if (['WAITING_THERAPIST_CONFIRM', 'PAYMENT_PENDING', 'WAITING_ADMIN_VERIFY_PAYMENT'].includes(booking.status)) {
      actions.push(
        <TouchableOpacity key="cancel" style={styles.actionDanger} onPress={() => handleCancel(booking.id)}>
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
    return actions;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={bookingsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={bookingsQuery.isFetching} onRefresh={() => bookingsQuery.refetch()} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.bookingTitle}>{item.package.name}</Text>
            <Text style={styles.meta}>{item.therapist.fullName}</Text>
            <Text style={styles.meta}>{new Date(item.preferredSchedule).toLocaleString('id-ID')}</Text>
            <Text style={styles.statusPill}>{item.status}</Text>
            <View style={styles.actions}>{renderStatusActions(item)}</View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.meta}>Belum ada booking.</Text>
          </View>
        )}
      />
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
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
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
});
