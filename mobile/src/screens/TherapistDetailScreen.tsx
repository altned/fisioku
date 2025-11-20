import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type TherapistReviewEntry } from '../api/client';

export function TherapistDetailScreen({ route, navigation }: NativeStackScreenProps<AppStackParamList, 'TherapistDetail'>) {
  const { therapist } = route.params;

  const handleBooking = () => {
    navigation.navigate('BookingRequest', { therapist });
  };

  const reviewsQuery = useQuery({
    queryKey: ['therapistReviews', therapist.id],
    queryFn: () => api.therapistReviews(therapist.id, { limit: 5 }),
  });

  const renderReview = ({ item }: { item: TherapistReviewEntry }) => (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewRating}>⭐ {item.rating} / 5</Text>
      <Text style={styles.reviewMeta}>Pasien: {item.patientName}</Text>
      <Text style={styles.reviewMeta}>
        {new Date(item.createdAt).toLocaleDateString('id-ID')}
      </Text>
      <Text style={styles.reviewComment}>
        {item.comment ? `"${item.comment}"` : 'Tidak ada komentar tambahan.'}
      </Text>
    </View>
  );

  const photoSource =
    therapist.photoUrl && therapist.photoUrl.length
      ? { uri: therapist.photoUrl }
      : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.photoCard}>
          {photoSource ? (
            <Image source={photoSource} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoInitial}>
                {therapist.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.photoHint}>Foto Terapis</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>{therapist.fullName}</Text>
          <Text style={styles.meta}>{therapist.city ?? 'Lokasi belum diisi'}</Text>
          <Text style={styles.meta}>Bidang: {therapist.specialties.join(', ') || '-'}</Text>
          <Text style={styles.meta}>
            Pengalaman: {therapist.experienceYears ? `${therapist.experienceYears} tahun` : 'Belum diisi'}
          </Text>
          <Text style={styles.rating}>
            {therapist.averageRating
              ? `⭐ ${therapist.averageRating.toFixed(1)} (${therapist.reviewCount} review)`
              : 'Belum ada rating'}
          </Text>
        </View>
        <View style={styles.card}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewTitle}>Review Terbaru</Text>
          <Text style={styles.reviewHint}>
            {reviewsQuery.isLoading
              ? 'Memuat...'
              : `${reviewsQuery.data?.length ?? 0} review ditampilkan`}
          </Text>
        </View>
        {reviewsQuery.isError ? (
          <Text style={styles.meta}>Gagal memuat review.</Text>
        ) : reviewsQuery.data && reviewsQuery.data.length > 0 ? (
          <FlatList
            data={reviewsQuery.data}
            keyExtractor={(item) => item.id}
            renderItem={renderReview}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <Text style={styles.meta}>Belum ada review untuk terapis ini.</Text>
        )}
        </View>
      </ScrollView>
      <View style={styles.footer}>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 16,
  },
  photoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
    gap: 12,
  },
  photo: {
    width: 180,
    height: 180,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoInitial: {
    fontSize: 64,
    fontWeight: '700',
    color: '#64748b',
  },
  photoHint: {
    fontSize: 12,
    color: '#94a3b8',
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
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  reviewHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  reviewItem: {
    paddingVertical: 8,
  },
  reviewRating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f97316',
  },
  reviewMeta: {
    fontSize: 12,
    color: '#475569',
  },
  reviewComment: {
    marginTop: 4,
    fontSize: 13,
    color: '#0f172a',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
});
