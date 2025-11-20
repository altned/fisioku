import { useCallback } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  api,
  uploadPaymentProofFile,
  type BookingResponse,
} from '../api/client';
import { PAYMENT_INFO } from '../constants/payment';
import type { AppStackParamList } from '../types/navigation';

export function BookingsScreen() {
  const { token } = useAuth();
  const stackNavigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const queryClient = useQueryClient();
  const {
    data: bookings,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => api.myBookings(token ?? ''),
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

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) =>
      api.cancelBooking(token ?? '', bookingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      Alert.alert('Berhasil', 'Booking berhasil dibatalkan.');
    },
  });

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

  return (
    <View style={styles.container}>
      <FlatList
        data={bookings ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => void refetch()}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.bookingTitle}>{item.package.name}</Text>
                <Text style={styles.meta}>{item.therapist.fullName}</Text>
                <Text style={styles.meta}>
                  {new Date(item.preferredSchedule).toLocaleString('id-ID')}
                </Text>
              </View>
              <Text style={styles.statusPill}>{item.status}</Text>
            </View>
            <View style={styles.paymentCard}>
              <Text style={styles.paymentTitle}>Instruksi Pembayaran</Text>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Transfer Bank</Text>
                <Text style={styles.paymentValue}>
                  {PAYMENT_INFO.bank.name}
                </Text>
                <Text style={styles.paymentValue}>
                  a.n {PAYMENT_INFO.bank.accountName} ({PAYMENT_INFO.bank.accountNumber})
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>QRIS</Text>
                <Text style={styles.paymentValue}>
                  {PAYMENT_INFO.qris.merchant}
                </Text>
                <Text style={styles.paymentValue}>
                  {PAYMENT_INFO.qris.description} (Ref: {PAYMENT_INFO.qris.reference})
                </Text>
              </View>
              <View style={styles.stepsCard}>
                <Text style={styles.stepsTitle}>Cara Pembayaran</Text>
                <Text style={styles.stepsText}>1. Lakukan transfer sesuai nominal paket.</Text>
                <Text style={styles.stepsText}>2. Simpan bukti transfer (foto/ screenshot).</Text>
                <Text style={styles.stepsText}>3. Tekan "Upload Bukti" kemudian pilih berkas bukti.
                  Setelah terkirim, admin akan memverifikasi.</Text>
              </View>
            </View>
            <View style={styles.actions}>{renderPatientActions(item)}</View>
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#475569' },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e0e7ff',
    color: '#312e81',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  paymentRow: {
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  paymentValue: {
    fontSize: 13,
    color: '#0f172a',
  },
  stepsCard: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 14,
  },
  stepsTitle: {
    color: '#f8fafc',
    fontWeight: '600',
    marginBottom: 6,
  },
  stepsText: {
    color: '#cbd5f5',
    fontSize: 12,
  },
  actions: { flexDirection: 'column', gap: 8, marginTop: 10 },
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
