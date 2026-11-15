import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button, Card, Chip, Divider, Screen, T, styles, tabular } from '@/components/ui';
import { companies, sectorList } from '@/data';
import type { Company } from '@/data/types';
import { crore, debtToEquity, last, peg, pct, positiveFcfYears, profitGrowth3, ratio, revenueGrowth3, segmentOf, segments, type Segment } from '@/lib/metrics';
import { scoreOf } from '@/lib/score';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

type Option = { label: string; test: (c: Company) => boolean };
type Filter = { key: string; label: string; options: Option[] };
const above = (get: (c: Company) => number | null, values: number[], unit = '%'): Option[] => values.map((v) => ({ label: `Above ${v}${unit}`, test: (c) => (get(c) ?? -Infinity) > v }));
const below = (get: (c: Company) => number | null, values: number[]): Option[] => values.map((v) => ({ label: `Below ${v}`, test: (c) => { const x = get(c); return x !== null && x < v; } }));

const filters: Filter[] = [
  { key: 'cap', label: 'Market capitalisation', options: [1000, 5000, 30000, 100000].map((v) => ({ label: `Above ${crore(v)}`, test: (c: Company) => c.marketCapCr > v })) },
  { key: 'rev', label: 'Revenue growth, three years', options: above(revenueGrowth3, [8, 12, 20]) },
  { key: 'profit', label: 'Profit growth, three years', options: above(profitGrowth3, [10, 15, 25]) },
  { key: 'roce', label: 'Return on capital employed', options: above((c) => last(c.roce), [12, 18, 22]) },
  { key: 'roe', label: 'Return on equity', options: above((c) => last(c.roe), [10, 15, 20]) },
  { key: 'de', label: 'Debt-to-equity', options: below((c) => debtToEquity(c), [1, 0.5, 0.1]) },
  { key: 'pe', label: 'Price-to-earnings', options: below((c) => c.pe, [40, 25, 15]) },
  { key: 'peg', label: 'Price/earnings-to-growth', options: below(peg, [2, 1.5, 1]) },
  { key: 'fcf', label: 'Free cash flow', options: [{ label: 'Positive in latest year', test: (c) => last(c.freeCashFlow) > 0 }, { label: 'Positive in every year', test: (c) => positiveFcfYears(c) === c.years.length }] },
  { key: 'promoter', label: 'Promoter holding', options: above((c) => c.promoter, [40, 50, 60]) },
];

type SortKey = 'score' | 'cap' | 'roce' | 'pe' | 'growth';
const sorts: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Research score' },
  { key: 'cap', label: 'Market capitalisation' },
  { key: 'roce', label: 'Return on capital' },
  { key: 'pe', label: 'Price-to-earnings' },
  { key: 'growth', label: 'Revenue growth' },
];

export default function Screener() {
  const t = useTheme();
  const router = useRouter();
  const { settings } = useStore();
  const [query, setQuery] = useState('');
  const [caps, setCaps] = useState<Segment[]>([]);
  const [sector, setSector] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<SortKey>('score');
  const [descending, setDescending] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const scored = useMemo(() => companies.map((c) => ({ c, score: scoreOf(c, settings.weights).total })), [settings.weights]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (x: { c: Company; score: number }) =>
      sort === 'score' ? x.score : sort === 'cap' ? x.c.marketCapCr : sort === 'roce' ? last(x.c.roce) : sort === 'pe' ? x.c.pe ?? 99999 : revenueGrowth3(x.c) ?? -99999;
    return scored
      .filter(({ c }) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q))
      .filter(({ c }) => caps.length === 0 || caps.includes(segmentOf(c)))
      .filter(({ c }) => !sector || c.sector === sector)
      .filter(({ c }) => filters.every((f) => chosen[f.key] === undefined || f.options[chosen[f.key]].test(c)))
      .sort((a, b) => (descending ? value(b) - value(a) : value(a) - value(b)));
  }, [scored, query, caps, sector, chosen, sort, descending]);

  const active = Object.keys(chosen).length + caps.length + (sector ? 1 : 0);
  const cycle = (f: Filter) =>
    setChosen((prev) => {
      const next = { ...prev };
      const at = prev[f.key];
      if (at === undefined) next[f.key] = 0;
      else if (at + 1 < f.options.length) next[f.key] = at + 1;
      else delete next[f.key];
      return next;
    });
  const reset = () => { setChosen({}); setCaps([]); setSector(null); setQuery(''); };

  const header = (
    <View style={{ gap: 16, paddingBottom: 12 }}>
      <TextInput
        accessibilityLabel="Search by company name or symbol"
        value={query}
        onChangeText={setQuery}
        placeholder="Search by company name or symbol"
        placeholderTextColor={t.muted}
        autoCorrect={false}
        style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, color: t.text, paddingHorizontal: 14, fontSize: 15 }}
      />
      <View style={styles.wrap}>
        {segments.map((s) => (
          <Chip key={s} label={s} on={caps.includes(s)} onPress={() => setCaps((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All sectors" on={!sector} onPress={() => setSector(null)} />
        {sectorList.map((s) => <Chip key={s} label={s} on={sector === s} onPress={() => setSector(s)} />)}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}><Button kind="outline" icon="options-outline" label={showFilters ? 'Hide filters' : `Filters${active ? ` (${active} active)` : ''}`} onPress={() => setShowFilters((v) => !v)} /></View>
        <View style={{ flex: 1 }}><Button kind="outline" label="Reset" onPress={reset} /></View>
      </View>
      {showFilters ? (
        <Card gap={0}>
          <T size={12} color={t.muted}>Tap a filter to step through its levels.</T>
          {filters.map((f, i) => (
            <View key={f.key}>
              {i > 0 ? <Divider /> : null}
              <Pressable accessibilityRole="button" onPress={() => cycle(f)} style={styles.row}>
                <T style={{ flex: 1 }}>{f.label}</T>
                <T size={13} weight={chosen[f.key] !== undefined ? '600' : '400'} color={chosen[f.key] !== undefined ? t.accent : t.muted}>
                  {chosen[f.key] !== undefined ? f.options[chosen[f.key]].label : 'Any'}
                </T>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
      <View style={{ gap: 8 }}>
        <T size={15} weight="700">{results.length} {results.length === 1 ? 'company matches' : 'companies match'}</T>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {sorts.map((s) => (
            <Chip
              key={s.key}
              label={`${s.label}${sort === s.key ? (descending ? ' ▼' : ' ▲') : ''}`}
              on={sort === s.key}
              onPress={() => (sort === s.key ? setDescending((d) => !d) : (setSort(s.key), setDescending(true)))}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <Screen title="Screener" subtitle={`${companies.length} companies in the database`} scroll={false}>
      <FlatList
        data={results}
        keyExtractor={(x) => x.c.symbol}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Divider}
        ListEmptyComponent={<T color={t.muted}>No companies match these filters. Loosen a filter or tap Reset.</T>}
        renderItem={({ item: { c, score } }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: c.symbol } })} style={{ paddingVertical: 10, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <T weight="500" lines={1} style={{ flex: 1 }}>{c.shortName}</T>
              <T size={13} weight="700" color={score >= 70 ? t.up : score >= 50 ? t.amber : t.down} style={tabular}>Score {score}</T>
            </View>
            <T size={12} color={t.muted}>{segmentOf(c)} · {c.sector} · {crore(c.marketCapCr)}</T>
            <T size={12} style={tabular}>
              Return on capital {pct(last(c.roce))} · Price-to-earnings {ratio(c.pe)} · Revenue growth {pct(revenueGrowth3(c))}
            </T>
          </Pressable>
        )}
      />
    </Screen>
  );
}
