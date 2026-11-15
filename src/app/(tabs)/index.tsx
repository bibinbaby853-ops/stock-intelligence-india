import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { View } from 'react-native';

import { Bar, Button, Card, Change, CompanyRow, Rows, Screen, Section, T, Tag, tabular } from '@/components/ui';
import { companies, getCompany, meta, snapshot } from '@/data';
import { categoriesFor } from '@/lib/discover';
import { daysBetween, longDate, num, segmentOf } from '@/lib/metrics';
import { scoreChange, scoreOf } from '@/lib/score';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const { watchlists, settings } = useStore();
  const w = settings.weights;

  const watched = useMemo(() => {
    const set = new Set(watchlists.flatMap((l) => l.symbols));
    return [...set].map((s) => getCompany(s)).filter((c) => c !== undefined);
  }, [watchlists]);

  const summary = useMemo(() => {
    const results = watched.filter((c) => c.nextResults && daysBetween(meta.priceAsOf, c.nextResults) >= 0 && daysBetween(meta.priceAsOf, c.nextResults) <= 7).length;
    const changed = watched.filter((c) => Math.abs(scoreChange(c, w).diff) >= 3).length;
    return { results, changed };
  }, [watched, w]);

  const candidates = useMemo(
    () => companies.map((c) => ({ c, score: scoreOf(c, w).total, cats: categoriesFor(c, w) })).filter((x) => x.score >= 70 && x.cats.length > 0).sort((a, b) => b.score - a.score).slice(0, 4),
    [w],
  );
  const sectors = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const c of companies) map.set(c.sector, [...(map.get(c.sector) ?? []), c.changePct]);
    return [...map.entries()].map(([name, v]) => ({ name, change: v.reduce((a, b) => a + b, 0) / v.length })).sort((a, b) => b.change - a.change);
  }, []);
  const sorted = useMemo(() => [...companies].sort((a, b) => b.changePct - a.changePct), []);
  const announcements = useMemo(
    () => companies.flatMap((c) => c.announcements.map((a) => ({ ...a, c }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [],
  );
  const { advances, declines } = snapshot.breadth;
  const share = (advances / Math.max(1, advances + declines)) * 100;
  const mood = share >= 65 ? 'Positive' : share >= 52 ? 'Mildly positive' : share >= 48 ? 'Neutral' : share >= 35 ? 'Mildly negative' : 'Negative';

  return (
    <Screen title="Stock Intelligence India" subtitle={`Data as of ${longDate(meta.priceAsOf)}`}>
      <Card>
        <T size={15} weight="700">Your research summary</T>
        {watched.length === 0 ? (
          <T>Your watchlist is empty. Add companies from the Screener or Discover sections to see upcoming results and score changes here.</T>
        ) : (
          <T>
            You follow {watched.length} {watched.length === 1 ? 'company' : 'companies'}. {summary.results} report quarterly results within a week, and {summary.changed} had a research score change of three points or more against the previous year.
          </T>
        )}
        <Button label={watched.length === 0 ? 'Find companies' : 'Review watchlist'} onPress={() => router.push(watched.length === 0 ? '/discover' : '/watchlist')} />
      </Card>

      <Section title="Indices" right={meta.sample ? 'Sample values' : 'End of day'}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {snapshot.indices.map((i) => (
            <View key={i.name} style={{ backgroundColor: t.surface, borderRadius: 12, padding: 12, gap: 4, flexBasis: '47%', flexGrow: 1 }}>
              <T size={12} color={t.muted}>{i.name}</T>
              <T size={17} weight="700" style={tabular}>{num(i.value, 2)}</T>
              <Change value={i.changePct} size={12} />
            </View>
          ))}
        </View>
      </Section>

      <Section title="Market sentiment" right="Companies in the database">
        <Card>
          <T size={17} weight="700">{mood}</T>
          <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            <View style={{ flex: Math.max(advances, 0.01), backgroundColor: t.up }} />
            <View style={{ flex: Math.max(declines, 0.01), backgroundColor: t.down }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={12} color={t.up}>{advances} advancing</T>
            <T size={12} color={t.down}>{declines} declining</T>
          </View>
        </Card>
      </Section>

      <Section title="Sector performance" right="Average change today">
        <Card gap={14}>
          {sectors.map((s) => (
            <View key={s.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={13}>{s.name}</T>
                <Change value={s.change} />
              </View>
              <Bar value={Math.abs(s.change) * 30} color={s.change >= 0 ? t.up : t.down} />
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Top gaining">
        <Card gap={0}>
          <Rows>{sorted.slice(0, 3).map((c) => <CompanyRow key={c.symbol} c={c} sub={segmentOf(c)} />)}</Rows>
        </Card>
      </Section>
      <Section title="Top declining">
        <Card gap={0}>
          <Rows>{sorted.slice(-3).reverse().map((c) => <CompanyRow key={c.symbol} c={c} sub={segmentOf(c)} />)}</Rows>
        </Card>
      </Section>

      <Section title="Screening candidates" right="Score 70 or more">
        <Card gap={0}>
          <Rows>
            {candidates.map(({ c, score, cats }) => (
              <CompanyRow key={c.symbol} c={c} sub={`${segmentOf(c)} · ${cats[0].title}`} right={<Tag label={`Score ${score}`} color={t.up} />} />
            ))}
          </Rows>
        </Card>
      </Section>

      <Section title="Corporate announcements">
        <Card gap={0}>
          <Rows>
            {announcements.map((a) => (
              <CompanyRow key={a.c.symbol + a.date + a.title} c={a.c} sub={a.title} right={<T size={12} color={t.muted}>{longDate(a.date)}</T>} />
            ))}
          </Rows>
        </Card>
      </Section>
    </Screen>
  );
}
