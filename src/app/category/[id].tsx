import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Bullets, Button, Card, Divider, Screen, ScoreBars, ScoreRing, T } from '@/components/ui';
import { meta } from '@/data';
import { getCategory, membersOf } from '@/lib/discover';
import { segmentOf } from '@/lib/metrics';
import { insightsOf, scoreOf } from '@/lib/score';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const { settings } = useStore();
  const category = getCategory(id);
  const members = useMemo(() => (category ? membersOf(category, settings.weights) : []), [category, settings.weights]);

  if (!category) {
    return (
      <Screen title="Discover" back>
        <T>This category does not exist.</T>
      </Screen>
    );
  }
  return (
    <Screen title={category.title} subtitle={`${members.length} ${members.length === 1 ? 'company' : 'companies'}`} back>
      <T size={13} color={t.muted}>Rule: {category.rule}</T>
      {members.length === 0 ? <T>No company in the database meets this rule at present.</T> : null}
      {members.map((c) => {
        const score = scoreOf(c, settings.weights);
        const ins = insightsOf(c);
        return (
          <Card key={c.symbol} gap={12}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T size={16} weight="700">{c.shortName}</T>
                <T size={12} color={t.muted}>{segmentOf(c)} · {c.sector}</T>
              </View>
              <ScoreRing score={score.total} />
            </View>
            <ScoreBars score={score} />
            <Divider />
            <T size={12} weight="700" color={t.up}>Strengths</T>
            <Bullets kind="up" items={ins.strengths.slice(0, 3)} />
            <T size={12} weight="700" color={t.down}>Weaknesses</T>
            <Bullets kind="down" items={ins.weaknesses.slice(0, 3)} />
            <T size={12} weight="700" color={t.amber}>Risks</T>
            <Bullets kind="risk" items={ins.risks.slice(0, 3)} />
            <T size={12} color={t.muted}>Sources: {meta.sources.join('; ')}</T>
            <Button label="Open full research" onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: c.symbol } })} />
          </Card>
        );
      })}
      <T size={12} color={t.muted}>A research score summarises reported fundamentals. It is not a recommendation and does not predict returns.</T>
    </Screen>
  );
}
