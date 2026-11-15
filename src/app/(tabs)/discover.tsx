import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { Screen, T } from '@/components/ui';
import { categories, highGrowthSectors, membersOf } from '@/lib/discover';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

export default function Discover() {
  const t = useTheme();
  const router = useRouter();
  const { settings } = useStore();
  const counts = useMemo(() => categories.map((c) => membersOf(c, settings.weights).length), [settings.weights]);

  return (
    <Screen title="Discover" subtitle="Rule-based stock discovery">
      <T size={13} color={t.muted}>
        Each category applies a published rule to reported financial figures. Appearing in a category is not a recommendation and does not predict returns.
      </T>
      <View style={{ gap: 10 }}>
        {categories.map((c, i) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.id } })}
            style={{ backgroundColor: t.surface, borderRadius: 14, padding: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <T size={15} weight="700" style={{ flex: 1 }}>{c.title}</T>
              <T size={13} weight="600" color={t.accent}>{counts[i]} {counts[i] === 1 ? 'company' : 'companies'}</T>
            </View>
            <T size={12} color={t.muted}>{c.id === 'sectors' ? `${c.rule} Currently: ${highGrowthSectors.join(' and ')}.` : c.rule}</T>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
