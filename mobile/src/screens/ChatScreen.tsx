import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { firestore } from '../services/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';

type Message = {
  id: string;
  senderId: string;
  message: string;
  sentAt?: Date;
};

export function ChatScreen({
  route,
}: NativeStackScreenProps<AppStackParamList, 'Chat'>) {
  const { bookingId } = route.params;
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const cachedUser =
    (queryClient.getQueryData(['me']) as { id: string } | undefined) ?? null;
  const fallbackUserQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.me(token ?? ''),
    enabled: Boolean(token) && !cachedUser,
  });
  const currentUser = cachedUser ?? fallbackUserQuery.data ?? null;

  const threadQuery = useQuery({
    queryKey: ['chatThread', bookingId],
    queryFn: () => api.chatThread(token ?? '', bookingId),
    enabled: Boolean(token),
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const firestoreId = threadQuery.data?.firestoreId;
    if (!firestoreId) {
      setMessages([]);
      return;
    }
    const ref = collection(
      firestore,
      'chat_threads',
      firestoreId,
      'messages',
    );
    const q = query(ref, orderBy('sentAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const next = snapshot.docs.map((doc) => {
        const data = doc.data() as {
          senderId: string;
          message: string;
          sentAt?: { toDate?: () => Date };
        };
        return {
          id: doc.id,
          senderId: data.senderId,
          message: data.message,
          sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : undefined,
        };
      });
      setMessages(next);
    });
    return () => unsubscribe();
  }, [threadQuery.data?.firestoreId]);

  const sendMessage = async () => {
    if (!input.trim() || !threadQuery.data?.firestoreId || !currentUser?.id) {
      return;
    }
    const text = input.trim();
    setInput('');
    try {
      await api.sendChatMessage(token ?? '', bookingId, text);
    } catch (error) {
      setInput(text);
      Alert.alert(
        'Gagal',
        error instanceof Error ? error.message : 'Tidak dapat mengirim pesan',
      );
    }
  };

  const isLocked = threadQuery.data?.locked;

  const sortedMessages = useMemo(() => messages, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={sortedMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUser?.id;
          return (
            <View
              style={[
                styles.messageBubble,
                isMine ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isMine && styles.myMessageText,
                ]}
              >
                {item.message}
              </Text>
              {item.sentAt ? (
                <Text style={styles.messageMeta}>
                  {item.sentAt.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.metaText}>
              {threadQuery.isLoading
                ? 'Memuat percakapan...'
                : 'Belum ada pesan.'}
            </Text>
          </View>
        }
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={
            isLocked
              ? 'Chat terkunci setelah sesi selesai'
              : 'Tulis pesan...'
          }
          editable={!isLocked}
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (isLocked || !input.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={isLocked || !input.trim()}
        >
          <Text style={styles.sendButtonText}>Kirim</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e2e8f0',
  },
  messageText: {
    color: '#0f172a',
  },
  myMessageText: {
    color: '#ffffff',
  },
  messageMeta: {
    marginTop: 6,
    fontSize: 11,
    color: '#cbd5f5',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  metaText: {
    color: '#64748b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
