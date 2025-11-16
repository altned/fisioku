import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api, uploadPaymentProofFile } from '../api/client';
import { PAYMENT_INFO } from '../constants/payment';

export function BookingDetailScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'BookingDetail'>) {
  const { booking } = route.params;
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: () => api.cancelBooking(token ?? '', booking.id),
    onSuccess: () => {
      Alert.alert('Berhasil', 'Booking dibatalkan.');
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      navigation.goBack();
    },
  });

  const canUploadProof = booking.status === 'PAYMENT_PENDING';
  const canCancel = ['WAITING_THERAPIST_CONFIRM', 'PAYMENT_PENDING', 'WAITING_ADMIN_VERIFY_PAYMENT'].includes(
    booking.status,
  );

  const handleUploadProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (result.canceled || !result.assets[0]) return;
    try {
      const { fileId } = await uploadPaymentProofFile(token ?? '', result.assets[0]);
      await api.uploadBookingProof(token ?? '', booking.id, fileId);
      Alert.alert('Sukses', 'Bukti pembayaran terkirim.');
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    } catch (error) {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Terjadi kesalahan');
    }
  };

  const handleCancel = () => {
    if (!canCancel) return;
    Alert.alert('Batalkan Booking', 'Yakin ingin membatalkan?', [
      { text: 'Tidak' },
      { text: 'Ya', style: 'destructive', onPress: () => cancelMutation.mutate() },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{booking.package.name}</Text>
        <Text style={styles.meta}>Terapis: {booking.therapist.fullName}</Text>
        <Text style={styles.meta}>Jadwal: {new Date(booking.preferredSchedule).toLocaleString('id-ID')}</Text>
        <Text style={styles.status}>Status: {booking.status}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Instruksi Pembayaran</Text>
          <Text style={styles.infoLabel}>Transfer Bank</Text>
          <Text style={styles.infoText}>
            {PAYMENT_INFO.bank.name} a.n {PAYMENT_INFO.bank.accountName} ({PAYMENT_INFO.bank.accountNumber})
          </Text>
          <Text style={styles.infoLabel}>QRIS</Text>
          <Text style={styles.infoText}>
            {PAYMENT_INFO.qris.merchant} – {PAYMENT_INFO.qris.description} (Ref: {PAYMENT_INFO.qris.reference})
          </Text>
        </View>
        {canUploadProof ? (
          <TouchableOpacity style={styles.button} onPress={handleUploadProof}>
            <Text style={styles.buttonText}>Upload Bukti Pembayaran</Text>
          </TouchableOpacity>
        ) : null}
        {canCancel ? (
          <TouchableOpacity style={styles.dangerButton} onPress={handleCancel} disabled={cancelMutation.isPending}>
            <Text style={styles.dangerButtonText}>
              {cancelMutation.isPending ? 'Membatalkan...' : 'Batalkan Booking'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f1f5f9',
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 14, color: '#475569' },
  status: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  button: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  dangerButton: {
    marginTop: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dangerButtonText: { color: '#991b1b', fontWeight: '600' },
  infoCard: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  infoText: { fontSize: 13, color: '#475569' },
});
