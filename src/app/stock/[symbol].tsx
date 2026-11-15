import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { Alert, Share, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { Bar, Bullets, Button, Card, Change, Chip, Columns, Divider, Row, Rows, Screen, ScoreBars, ScoreRing, Section, T, Tag, styles, tabular } from '@/components/ui';
import { companies, getCompany, meta } from '@/data';
import { categoriesFor } from '@/lib/discover';
import { cashConversion, crore, debtToEquity, last, longDate, peg, pct, positiveFcfYears, ratio, rupees, segmentOf, signedPct } from '@/lib/metrics';
import { reportHtml, reportLines, shareText } from '@/lib/report';
import { insightsOf, scoreChange, scoreOf } from '@/lib/score';
import { useStore } from '@/store';
import { useTheme } from '@/theme';

const periods: { label: string; weeks: number }[] = [
  { label: '1M', weeks: 4 },
  { label: '3M', weeks: 13 },
  { label: '6M', weeks: 26 },
  { label: '1Y', weeks: 52 },
  { label: '3Y', weeks: 156 },
  { label: '5Y', weeks: 260 },
];
const periodNames: Record<string, string> = { '1M': 'one month', '3M': 'three months', '6M': 'six months', '1Y': 'one year', '3Y': 'three years', '5Y': 'five years' };

export default function StockScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const t = useTheme();
  const router = useRouter();
  const { settings, watchlists, toggleSymbol, isWatched } = useStore();
  const [period, setPeriod] = useState('1Y');
  const [choosing, setChoosing] = useState(false);
  const c = getCompany(symbol);
  const peers = useMemo(() => (c ? companies.filter((x) => x.sector === c.sector && x.symbol !== c.symbol).sort((a, b) => Math.abs(a.marketCapCr - c.marketCapCr) - Math.abs(b.marketCapCr - c.marketCapCr)).slice(0, 3) : []), [c]);

  if (!c) {
    return (
      <Screen title="Company not found" back>
        <T>This company is not in the database.</T>
      </Screen>
    );
  }

  const w = settings.weights;
  const score = scoreOf(c, w);
  const change = scoreChange(c, w);
  const ins = insightsOf(c);
  const weeks = periods.find((p) => p.label === period)!.weeks;
  const series = c.prices.slice(-(weeks + 1));
  const periodReturn = (last(series) / series[0] - 1) * 100;
  const available = c.prices.length - 1 >= weeks;
  const watched = isWatched(c.symbol);
  const cats = categoriesFor(c, w);
  const pePosition = Math.max(0, Math.min(100, (((c.pe ?? c.peMedian) - c.peLow) / (c.peHigh - c.peLow)) * 100));
  const conversion = cashConversion(c);

  const addOrChoose = () => {
    if (watchlists.length === 1) toggleSymbol(watchlists[0].id, c.symbol);
    else setChoosing((v) => !v);
  };
  const exportReport = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: reportHtml(c, w) });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${c.shortName} research report` });
      else Alert.alert('Report created', `The report file was saved at ${uri}`);
    } catch {
      Alert.alert('The report could not be created', 'Please try again.');
    }
  };

  return (
    <Screen title={c.shortName} subtitle={`${c.symbol} · ${segmentOf(c)} · ${c.sector}`} back>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <T size={32} weight="700" style={tabular}>{rupees(c.price)}</T>
          <Change value={c.changePct} size={14} />
        </View>
        <T size={12} color={t.muted}>
          {meta.sample ? 'Sample price' : 'Closing price'} as of {longDate(meta.priceAsOf)} · Market capitalisation {crore(c.marketCapCr)}
        </T>
      </View>

      <Card>
        <LineChart values={series} color={periodReturn >= 0 ? t.up : t.down} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {periods.map((p) => (
            <View key={p.label} style={{ flex: 1 }}>
              <Chip label={p.label} on={period === p.label} onPress={() => setPeriod(p.label)} />
            </View>
          ))}
        </View>
        <T size={12} color={t.muted}>
          Change over {periodNames[period]}: <T size={12} weight="600" color={periodReturn >= 0 ? t.up : t.down}>{signedPct(periodReturn, 1)}</T>
          {available ? '' : ' (shorter history available)'}
        </T>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}><Button label={watched && watchlists.length === 1 ? 'Remove from watchlist' : watched ? 'Change watchlists' : 'Add to watchlist'} icon={watched ? 'bookmark' : 'bookmark-outline'} onPress={addOrChoose} /></View>
        <View style={{ flex: 1 }}><Button kind="outline" label="Share" icon="share-outline" onPress={() => Share.share({ message: shareText(c, w) })} /></View>
      </View>
      {choosing ? (
        <Card>
          <T size={12} color={t.muted}>Choose the lists that include this company.</T>
          <View style={styles.wrap}>
            {watchlists.map((l) => <Chip key={l.id} label={l.name} on={l.symbols.includes(c.symbol)} onPress={() => toggleSymbol(l.id, c.symbol)} />)}
          </View>
        </Card>
      ) : null}

      <Section title="Research score" right={`Financial year ${last(c.years)}`}>
        <Card gap={12}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <ScoreRing score={score.total} />
            <View style={{ flex: 1, gap: 4 }}>
              <T size={13}>
                {change.diff === 0 ? 'Unchanged' : `${change.diff > 0 ? 'Up' : 'Down'} ${Math.abs(change.diff)} points`} against financial year {last(c.years, 1)} ({change.before}).
              </T>
              {change.moves[0] ? <T size={12} color={t.muted}>Largest driver: {change.moves[0].label.toLowerCase()}, {change.moves[0].from} to {change.moves[0].to}.</T> : null}
            </View>
          </View>
          <ScoreBars score={score} />
          {cats.length ? (
            <View style={styles.wrap}>{cats.map((cat) => <Tag key={cat.id} label={cat.title} color={t.accent} />)}</View>
          ) : null}
          <T size={12} color={t.muted}>A research score summarises reported fundamentals. It is not a recommendation and does not predict returns.</T>
        </Card>
      </Section>

      <Section title="Company overview">
        <T>{c.overview}</T>
      </Section>

      <Section title="Revenue" right="₹ crore"><Card><Columns values={c.revenue} labels={c.years} /></Card></Section>
      <Section title="Net profit" right="₹ crore"><Card><Columns values={c.profit} labels={c.years} color={t.up} /></Card></Section>
      <Section title="Return on capital employed" right="Percent"><Card><Columns values={c.roce} labels={c.years} color={t.amber} decimals={1} /></Card></Section>
      <Section title="Return on equity" right="Percent"><Card><Columns values={c.roe} labels={c.years} color={t.amber} decimals={1} /></Card></Section>

      <Section title="Debt and cash flow">
        <Card gap={0}>
          <Rows>
            <Row title="Debt-to-equity" sub={`${ratio(c.debtToEquityHistory[0], 2)} in ${c.years[0]}`} right={ratio(debtToEquity(c), 2)} />
            <Row title="Interest cover" right={c.interestCover === null ? 'Negligible debt' : `${ratio(c.interestCover)} times`} />
            <Row title="Operating cash flow" sub={conversion === null ? undefined : `${pct(conversion * 100, 0)} of net profit`} right={crore(last(c.operatingCashFlow))} />
            <Row title="Free cash flow" sub={`Positive in ${positiveFcfYears(c)} of ${c.years.length} years`} right={crore(last(c.freeCashFlow))} rightColor={last(c.freeCashFlow) < 0 ? t.down : undefined} />
          </Rows>
        </Card>
      </Section>

      <Section title="Valuation history" right="Price-to-earnings">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T size={13} style={tabular}><T size={13} color={t.muted}>Five-year low </T>{ratio(c.peLow)}</T>
            <T size={13} style={tabular}><T size={13} color={t.muted}>Median </T>{ratio(c.peMedian)}</T>
            <T size={13} style={tabular}><T size={13} color={t.muted}>High </T>{ratio(c.peHigh)}</T>
          </View>
          <View style={{ height: 16, justifyContent: 'center' }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.surface2 }} />
            {c.pe !== null ? <View style={{ position: 'absolute', left: `${pePosition}%`, width: 4, height: 16, borderRadius: 2, backgroundColor: t.amber }} /> : null}
          </View>
          <T size={12} color={t.muted}>
            {c.pe === null ? 'Not available because the company reported a loss.' : `Now ${ratio(c.pe)}, ${c.pe > c.peMedian ? 'above' : 'below'} the five-year median. Price/earnings-to-growth: ${ratio(peg(c))}.`}
          </T>
        </Card>
      </Section>

      <Section title="Ownership">
        <Card gap={12}>
          {([['Promoters', c.promoter, t.accent], ['Foreign institutions', c.foreignInstitutions, t.up], ['Domestic institutions', c.domesticInstitutions, t.amber], ['Public and others', Math.max(0, 100 - c.promoter - c.foreignInstitutions - c.domesticInstitutions), t.muted]] as const).map(([label, value, color]) => (
            <View key={label} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={13}>{label}</T>
                <T size={13} style={tabular}>{pct(value)}</T>
              </View>
              <Bar value={value} color={color} />
            </View>
          ))}
          <T size={12} color={c.pledged > 0 ? t.down : t.muted}>
            Promoter shares pledged: {c.pledged > 0 ? `${pct(c.pledged)}${c.pledged !== c.pledgedPrev ? ` (previously ${pct(c.pledgedPrev)})` : ''}` : 'none'}
          </T>
        </Card>
      </Section>

      <Section title="Competitor comparison" right={c.sector}>
        <Card gap={0}>
          <Rows>
            {[c, ...peers].map((x) => (
              <Row
                key={x.symbol}
                title={x.shortName}
                sub={`Return on capital ${pct(last(x.roce))} · Price-to-earnings ${ratio(x.pe)} · Debt-to-equity ${ratio(debtToEquity(x), 2)}`}
                right={<T size={13} weight="700" style={tabular}>Score {scoreOf(x, w).total}</T>}
                onPress={x.symbol === c.symbol ? undefined : () => router.push({ pathname: '/stock/[symbol]', params: { symbol: x.symbol } })}
              />
            ))}
          </Rows>
        </Card>
      </Section>

      <Section title="Latest quarterly results" right={c.quarter.label}>
        <Card gap={0}>
          <Rows>
            <Row title="Revenue" right={crore(c.quarter.revenue)} subRight={`${signedPct(c.quarter.revenueGrowth, 1)} year on year`} />
            <Row title="Net profit" right={crore(c.quarter.profit)} subRight={`${signedPct(c.quarter.profitGrowth, 1)} year on year`} />
            {c.nextResults ? <Row title="Next results" right={longDate(c.nextResults)} /> : null}
          </Rows>
        </Card>
      </Section>

      <Section title="Corporate announcements">
        <Card gap={0}>
          <Rows>{c.announcements.map((a) => <Row key={a.date + a.title} title={a.title} right={longDate(a.date)} rightColor={t.muted} />)}</Rows>
        </Card>
      </Section>

      <Section title="Research report" right="Generated from the database">
        <Card gap={12}>
          {reportLines(c).map((l) => (
            <View key={l.text} style={{ gap: 4 }}>
              <Tag label={l.kind} color={l.kind === 'Fact' ? t.accent : t.amber} />
              <T size={13}>{l.text}</T>
            </View>
          ))}
          <Divider />
          <T size={12} weight="700" color={t.up}>Strengths</T>
          <Bullets kind="up" items={ins.strengths} />
          <T size={12} weight="700" color={t.down}>Weaknesses</T>
          <Bullets kind="down" items={ins.weaknesses} />
          <T size={12} color={t.muted}>Sources: {meta.sources.join('; ')}. Not investment advice.</T>
        </Card>
      </Section>

      <Section title="Major risk indicators">
        <Card><Bullets kind="risk" items={ins.risks} /></Card>
      </Section>

      <Button kind="outline" label="Export report" icon="document-text-outline" onPress={exportReport} />
      <Button kind="outline" label="Ask the research assistant about this company" icon="chatbubble-ellipses-outline" onPress={() => router.push({ pathname: '/assistant', params: { ask: `Explain why the research score changed for ${c.shortName}` } })} />
    </Screen>
  );
}
