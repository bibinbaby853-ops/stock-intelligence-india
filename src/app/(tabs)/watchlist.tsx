import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button, Card, Change, Chip, Divider, Rows, Screen, Section, T, styles, tabular } from '@/components/ui';
import { getCompany, meta } from '@/data';
import type { Company } from '@/data/types';
import { crore, daysBetween, debtToEquity, last, longDate, pct, ratio, revenueGrowth3, rupees } from '@/lib/metrics';
import { scoreChange, scoreOf } from '@/lib/score';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

export default function WatchlistScreen() {
  const t = useTheme();
  const router = useRouter();
  const { watchlists, addList, removeList, toggleSymbol, settings } = useStore();
  const [currentId, setCurrentId] = useState<string | undefined>(watchlists[0]?.id);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [comparing, setComparing] = useState(false);
  const current = watchlists.find((w) => w.id === currentId) ?? watchlists[0];
  const items = useMemo(() => current.symbols.map((s) => getCompany(s)).filter((c): c is Company => !!c), [current]);
  const total = watchlists.reduce((n, w) => n + w.symbols.length, 0);
  const open = (c: Company) => router.push({ pathname: '/stock/[symbol]', params: { symbol: c.symbol } });

  const note = (c: Company): { text: string; color: string } => {
    if (c.nextResults && daysBetween(meta.priceAsOf, c.nextResults) >= 0) return { text: `Quarterly results on ${longDate(c.nextResults)}`, color: t.accent };
    if (c.pledged > c.pledgedPrev) return { text: `Promoter pledge up to ${pct(c.pledged)}`, color: t.down };
    const ch = scoreChange(c, settings.weights);
    if (ch.diff !== 0) return { text: `Research score ${ch.now}, ${ch.diff > 0 ? 'up' : 'down'} from ${ch.before}`, color: ch.diff > 0 ? t.up : t.down };
    return { text: `Price-to-earnings ${ratio(c.pe)} against median ${ratio(c.peMedian)}`, color: t.muted };
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addList(trimmed);
    setName('');
    setAdding(false);
  };
  const confirmRemove = () =>
    Alert.alert('Delete this watchlist?', `"${current.name}" and its ${current.symbols.length} companies will be removed from the list.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { removeList(current.id); setCurrentId(watchlists.find((w) => w.id !== current.id)?.id); } },
    ]);

  const compareRows: { label: string; get: (c: Company) => string }[] = [
    { label: 'Research score', get: (c) => String(scoreOf(c, settings.weights).total) },
    { label: 'Market capitalisation', get: (c) => crore(c.marketCapCr) },
    { label: 'Return on capital employed', get: (c) => pct(last(c.roce)) },
    { label: 'Return on equity', get: (c) => pct(last(c.roe)) },
    { label: 'Revenue growth, three years', get: (c) => pct(revenueGrowth3(c)) },
    { label: 'Debt-to-equity', get: (c) => ratio(debtToEquity(c), 2) },
    { label: 'Price-to-earnings', get: (c) => ratio(c.pe) },
    { label: 'Promoter holding', get: (c) => pct(c.promoter) },
  ];

  return (
    <Screen title="Watchlist" subtitle={`${watchlists.length} ${watchlists.length === 1 ? 'list' : 'lists'} · ${total} ${total === 1 ? 'company' : 'companies'}`}>
      <View style={styles.wrap}>
        {watchlists.map((w) => <Chip key={w.id} label={w.name} on={w.id === current.id} onPress={() => { setCurrentId(w.id); setComparing(false); }} />)}
        <Chip label="+ New list" onPress={() => setAdding((v) => !v)} />
      </View>
      {adding ? (
        <Card>
          <TextInput
            accessibilityLabel="Name of the new watchlist"
            value={name}
            onChangeText={setName}
            placeholder="Name of the new watchlist"
            placeholderTextColor={t.muted}
            onSubmitEditing={create}
            style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: t.line, color: t.text, paddingHorizontal: 14, fontSize: 15 }}
          />
          <Button label="Create watchlist" onPress={create} />
        </Card>
      ) : null}

      <Section title={current.name} right={`${items.length} ${items.length === 1 ? 'company' : 'companies'}`}>
        {items.length === 0 ? (
          <Card>
            <T>This list is empty. Open any company and tap "Add to watchlist".</T>
            <Button label="Find companies" onPress={() => router.push('/screener')} />
          </Card>
        ) : (
          <Card gap={0}>
            <Rows>
              {items.map((c) => {
                const n = note(c);
                return (
                  <View key={c.symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pressable accessibilityRole="button" onPress={() => open(c)} style={{ flex: 1, paddingVertical: 10, gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <T weight="500" lines={1} style={{ flex: 1 }}>{c.shortName}</T>
                        <T style={tabular}>{rupees(c.price)}</T>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                        <T size={12} color={n.color} style={{ flex: 1 }}>{n.text}</T>
                        <Change value={c.changePct} size={12} />
                      </View>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${c.shortName} from this list`} onPress={() => toggleSymbol(current.id, c.symbol)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <T size={18} color={t.muted}>×</T>
                    </Pressable>
                  </View>
                );
              })}
            </Rows>
          </Card>
        )}
      </Section>

      {items.length > 0 ? (
        <Section title="Changes in fundamentals" right="Latest year against previous">
          <Card gap={0}>
            <Rows>
              {items.map((c) => {
                const diff = last(c.roce) - last(c.roce, 1);
                return (
                  <Pressable key={c.symbol} accessibilityRole="button" onPress={() => open(c)} style={styles.row}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T weight="500" lines={1}>{c.shortName}</T>
                      <T size={12} color={t.muted}>Debt-to-equity {ratio(debtToEquity(c, 1), 2)} → {ratio(debtToEquity(c), 2)}</T>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <T size={13} color={diff >= 0 ? t.up : t.down} style={tabular}>{pct(last(c.roce, 1))} → {pct(last(c.roce))}</T>
                      <T size={12} color={t.muted}>Return on capital</T>
                    </View>
                  </Pressable>
                );
              })}
            </Rows>
          </Card>
        </Section>
      ) : null}

      {items.length >= 2 ? <Button label={comparing ? 'Hide comparison' : 'Compare companies in this list'} onPress={() => setComparing((v) => !v)} /> : null}
      {comparing && items.length >= 2 ? (
        <Card>
          <ScrollView horizontal>
            <View>
              <View style={{ flexDirection: 'row' }}>
                <T size={12} color={t.muted} style={{ width: 150 }}>Measure</T>
                {items.map((c) => <T key={c.symbol} size={12} weight="700" lines={2} style={{ width: 120, textAlign: 'right' }}>{c.shortName}</T>)}
              </View>
              {compareRows.map((r) => (
                <View key={r.label}>
                  <Divider />
                  <View style={{ flexDirection: 'row', paddingVertical: 10 }}>
                    <T size={12} color={t.muted} style={{ width: 150 }}>{r.label}</T>
                    {items.map((c) => <T key={c.symbol} size={13} style={[tabular, { width: 120, textAlign: 'right' }]}>{r.get(c)}</T>)}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      {watchlists.length > 1 ? <Button kind="outline" label="Delete this watchlist" onPress={confirmRemove} /> : null}
    </Screen>
  );
}
