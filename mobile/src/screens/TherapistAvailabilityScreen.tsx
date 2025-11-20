import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type TherapistAvailability } from '../api/client';
import { ActivityIndicator } from 'react-native';

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function TherapistAvailabilityScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token),
  });
  const therapistId = meQuery.data?.id;
  const availabilityQuery = useQuery({
    queryKey: ['availability', therapistId],
    queryFn: () => api.therapistAvailability(token ?? '', therapistId ?? ''),
    enabled: Boolean(token && therapistId),
  });

  const [startTime, setStartTime] = useState(addHours(new Date(), 2));
  const [endTime, setEndTime] = useState(addHours(new Date(), 3));
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Token tidak tersedia');
      if (!therapistId) throw new Error('ID terapis tidak ditemukan');
      if (endTime.getTime() <= startTime.getTime()) {
        throw new Error('Waktu selesai harus lebih besar dari waktu mulai');
      }
      await api.createTherapistAvailability(token, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
    },
    onSuccess: () => {
      Alert.alert('Sukses', 'Ketersediaan berhasil ditambahkan.');
      void queryClient.invalidateQueries({ queryKey: ['availability', therapistId] });
    },
    onError: (error) => {
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Tidak dapat menambah ketersediaan',
      );
    },
  });

  const openPicker = (field: 'start' | 'end') => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: field === 'start' ? startTime : endTime,
        mode: 'date',
        onChange: (_, selectedDate) => {
          if (!selectedDate) return;
          const next = new Date(selectedDate);
          next.setHours(
            (field === 'start' ? startTime : endTime).getHours(),
            (field === 'start' ? startTime : endTime).getMinutes(),
            0,
            0,
          );
          DateTimePickerAndroid.open({
            value: next,
            mode: 'time',
            onChange: (_, selectedTime) => {
              if (!selectedTime) return;
              const withTime = new Date(next);
              withTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
              if (field === 'start') {
                setStartTime(withTime);
                if (withTime.getTime() >= endTime.getTime()) {
                  setEndTime(addHours(withTime, 1));
                }
              } else {
                setEndTime(withTime);
              }
            },
          });
        },
      });
    } else {
      setActivePicker(field);
    }
  };

  const pickerComponent = useMemo(() => {
    if (Platform.OS !== 'ios' || !activePicker) {
      return null;
    }
    const value = activePicker === 'start' ? startTime : endTime;
    return (
      <DateTimePicker
        value={value}
        mode="datetime"
        onChange={(_, selected) => {
          if (!selected) {
            setActivePicker(null);
            return;
          }
          if (activePicker === 'start') {
            setStartTime(selected);
            if (selected.getTime() >= endTime.getTime()) {
              setEndTime(addHours(selected, 1));
            }
          } else {
            setEndTime(selected);
          }
        }}
      />
    );
  }, [activePicker, endTime, startTime]);

  if (meQuery.isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (meQuery.data?.role !== 'THERAPIST') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.meta}>
          Halaman ini hanya tersedia untuk akun terapis.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Atur Ketersediaan</Text>
        <Text style={styles.meta}>
          Pilih rentang waktu yang tersedia. Waktu harus minimal 1 jam dari sekarang.
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.dateInput} onPress={() => openPicker('start')}>
            <Text style={styles.label}>Mulai</Text>
            <Text style={styles.dateText}>{startTime.toLocaleString('id-ID')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateInput} onPress={() => openPicker('end')}>
            <Text style={styles.label}>Selesai</Text>
            <Text style={styles.dateText}>{endTime.toLocaleString('id-ID')}</Text>
          </TouchableOpacity>
        </View>
        {pickerComponent}
        <TouchableOpacity
          style={[styles.button, createMutation.isPending && styles.buttonDisabled]}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          <Text style={styles.buttonText}>
            {createMutation.isPending ? 'Menyimpan...' : 'Tambah Slot'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Ketersediaan Mendatang</Text>
        {availabilityQuery.isLoading && <Text style={styles.meta}>Memuat...</Text>}
        {availabilityQuery.data && availabilityQuery.data.length === 0 && (
          <Text style={styles.meta}>Belum ada slot tersedia. Tambahkan di atas.</Text>
        )}
        {availabilityQuery.data ? (
          <FlatList
            data={availabilityQuery.data.sort(
              (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
            )}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <AvailabilityItem availability={item} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : null}
      </View>
    </View>
  );
}

function AvailabilityItem({ availability }: { availability: TherapistAvailability }) {
  return (
    <View style={styles.availabilityItem}>
      <Text style={styles.availabilityText}>
        {new Date(availability.startTime).toLocaleString('id-ID')} -
        {' '}
        {new Date(availability.endTime).toLocaleString('id-ID')}
      </Text>
      {availability.recurringWeekday !== null && availability.isRecurring ? (
        <Text style={styles.recurring}>Pengulangan mingguan</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#2563eb',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0f172a',
  },
  availabilityItem: {
    paddingVertical: 8,
  },
  availabilityText: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  recurring: {
    fontSize: 12,
    color: '#64748b',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },
});
