import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

export function TherapistDetailScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'TherapistDetail'>) {
  const { therapist } = route.params;

  const handleBooking = () => {
    navigation.navigate('BookingRequest', { therapist });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{therapist.fullName}</Text>
        <Text style={styles.meta}>{therapist.city ?? 'Lokasi belum diisi'}</Text>
        <Text style={styles.meta}>Bidang: {therapist.specialties.join(', ') || '-'}</Text>
        <Text style={styles.meta}>
          Pengalaman: {therapist.experienceYears ? `${therapist.experienceYears} tahun` : 'Belum diisi'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleBooking}>
          <Text style={styles.buttonText}>Mulai Booking</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  meta: {
    fontSize: 15,
    color: '#475569',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
