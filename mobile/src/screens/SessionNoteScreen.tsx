import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import type { AppStackParamList } from '../types/navigation';

export function SessionNoteScreen({
  route,
  navigation,
}: NativeStackScreenProps<AppStackParamList, 'SessionNote'>) {
  const { bookingId, sessionId, sessionNumber, existingNote } = route.params;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState(existingNote ?? '');

  const mutation = useMutation({
    mutationFn: () =>
      api.upsertSessionNote(token ?? '', sessionId, { content: content.trim() }),
    onSuccess: () => {
      Alert.alert('Tersimpan', 'Catatan sesi berhasil diperbarui.');
      void queryClient.invalidateQueries({ queryKey: ['assignedBookings'] });
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      navigation.goBack();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Gagal menyimpan catatan';
      Alert.alert('Error', message);
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catatan Sesi #{sessionNumber}</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Tulis catatan untuk sesi ini..."
        multiline
        value={content}
        onChangeText={setContent}
      />
      <TouchableOpacity
        style={styles.submitButton}
        onPress={() => mutation.mutate()}
        disabled={mutation.isPending || !content.trim()}
      >
        <Text style={styles.submitText}>
          {mutation.isPending ? 'Menyimpan...' : 'Simpan Catatan'}
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
  textArea: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 16,
    padding: 12,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    minHeight: 160,
  },
  submitButton: {
    backgroundColor: '#2563eb',
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
