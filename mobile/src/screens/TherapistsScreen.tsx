import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { api, type TherapistSummary } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../types/navigation';

export function TherapistsScreen() {
  const { token } = useAuth();
  const stackNavigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['therapists', search],
    queryFn: () => api.therapists(token ?? '', search ? { search } : undefined),
    enabled: Boolean(token),
  });

  const filteredData = useMemo(() => {
    if (!query.data) return [];
    if (!search.trim()) return query.data.data;
    const keyword = search.toLowerCase();
    return query.data.data.filter((therapist) =>
      therapist.fullName.toLowerCase().includes(keyword) ||
      therapist.city?.toLowerCase().includes(keyword) ||
      therapist.specialties.some((spec) => spec.toLowerCase().includes(keyword)),
    );
  }, [query.data, search]);

  const handleSelect = (therapist: TherapistSummary) => {
    stackNavigation.navigate('TherapistDetail', { therapist });
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Cari terapis (nama/kota/bidang)"
        style={styles.searchInput}
      />
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>{item.city ?? 'Lokasi belum diisi'}</Text>
              <Text style={styles.meta}>{item.specialties.join(', ') || 'Bidang belum diisi'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.isLoading ? <Text style={styles.meta}>Memuat terapis...</Text> : <Text style={styles.meta}>Tidak ada terapis ditemukan.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  meta: {
    fontSize: 13,
    color: '#64748b',
  },
});
