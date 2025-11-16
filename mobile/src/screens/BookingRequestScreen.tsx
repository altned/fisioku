import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { PAYMENT_INFO } from '../constants/payment';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ActivityIndicator } from 'react-native';

export function BookingRequestScreen({ route }: NativeStackScreenProps<AppStackParamList, 'BookingRequest'>) {
  const { therapist } = route.params;
  const { token } = useAuth();
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 2 * 60 * 60 * 1000));
  const [showPicker, setShowPicker] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: ['packages'],
    queryFn: api.packages,
  });

  useEffect(() => {
    if (packagesQuery.data?.length && !selectedPackageId) {
      setSelectedPackageId(packagesQuery.data[0].id);
    }
  }, [packagesQuery.data, selectedPackageId]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Token tidak tersedia');
      if (!selectedPackageId) throw new Error('Pilih paket terlebih dahulu');
      const booking = await api.createBooking(token, {
        therapistId: therapist.id,
        packageId: selectedPackageId,
        preferredSchedule: date.toISOString(),
        consentAccepted: true,
        notesFromPatient: notes,
      });
      await api.acceptConsent(token, booking.id, 'Consent mobile v1.0');
      return booking;
    },
    onSuccess: () => {
      Alert.alert('Berhasil', 'Permintaan booking terkirim.');
    },
    onError: (error) => {
      Alert.alert('Gagal', error instanceof Error ? error.message : 'Terjadi kesalahan');
    },
  });

  const handleSubmit = () => {
    createMutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Booking dengan {therapist.fullName}</Text>
        <Text style={styles.meta}>Tentukan jadwal preferensi & catatan singkat.</Text>
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateText}>{date.toLocaleString('id-ID')}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            onChange={(_, selected) => {
              setShowPicker(Platform.OS === 'ios');
              if (selected) {
                setDate(selected);
              }
            }}
          />
        )}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Keluhan atau catatan tambahan"
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <View>
          <Text style={styles.meta}>Pilih Paket</Text>
          {packagesQuery.isLoading && <ActivityIndicator />}
          {packagesQuery.data ? (
            <View style={styles.packageList}>
              {packagesQuery.data.map((pkg) => (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.packageItem,
                    selectedPackageId === pkg.id && styles.packageItemSelected,
                  ]}
                  onPress={() => setSelectedPackageId(pkg.id)}
                >
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageMeta}>{pkg.sessionCount} sesi • Rp{Number(pkg.price).toLocaleString('id-ID')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
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
        <TouchableOpacity
          style={[styles.button, (!selectedPackageId || createMutation.isPending) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedPackageId || createMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {createMutation.isPending ? 'Mengirim...' : 'Kirim Permintaan'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    padding: 20,
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  meta: {
    fontSize: 14,
    color: '#64748b',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
  },
  button: {
    backgroundColor: '#047857',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  packageList: {
    gap: 8,
    marginTop: 8,
  },
  packageItem: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  packageItemSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#e0f2fe',
  },
  packageName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  packageMeta: {
    fontSize: 13,
    color: '#475569',
  },
  infoCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    gap: 6,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  infoText: {
    fontSize: 13,
    color: '#475569',
  },
});
