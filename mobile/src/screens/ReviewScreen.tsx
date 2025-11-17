import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { AppStackParamList } from '../types/navigation';

const RATINGS = [1, 2, 3, 4, 5];

export function ReviewScreen({
  route,
  navigation,
}: NativeStackScreenProps<AppStackParamList, 'Review'>) {
  const { bookingId } = route.params;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.submitReview(token ?? '', bookingId, {
        rating,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      Alert.alert('Terima kasih!', 'Review berhasil dikirim.');
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      navigation.goBack();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Gagal menyimpan review';
      Alert.alert('Error', message);
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bagaimana pengalaman Anda?</Text>
      <View style={styles.ratingRow}>
        {RATINGS.map((value) => (
          <TouchableOpacity
            key={value}
            style={[
              styles.ratingChip,
              rating === value && styles.ratingChipActive,
            ]}
            onPress={() => setRating(value)}
          >
            <Text
              style={[
                styles.ratingText,
                rating === value && styles.ratingTextActive,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.textArea}
        placeholder="Ceritakan detail pengalaman Anda (opsional)"
        multiline
        value={comment}
        onChangeText={setComment}
      />
      <TouchableOpacity
        style={styles.submitButton}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? 'Mengirim...' : 'Kirim Review'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  ratingText: {
    fontSize: 18,
    color: '#0f172a',
    fontWeight: '600',
  },
  ratingTextActive: {
    color: '#fff',
  },
  textArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 16,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    minHeight: 140,
  },
  submitButton: {
    backgroundColor: '#047857',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
