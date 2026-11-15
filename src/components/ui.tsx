import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { meta } from '@/data';
import type { Company } from '@/data/types';
import { crore, num, segmentOf, signedPct } from '@/lib/metrics';
import { componentKeys, componentLabels, type Score } from '@/lib/score';
import { useTheme } from '@/theme';

export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export function T({ children, size = 14, color, weight = '400', style, lines }: { children: React.ReactNode; size?: number; color?: string; weight?: TextStyle['fontWeight']; style?: StyleProp<TextStyle>; lines?: number }) {
  const t = useTheme();
  return (
    <Text numberOfLines={lines} style={[{ fontSize: size, lineHeight: Math.round(size * 1.45), color: color ?? t.text, fontWeight: weight }, style]}>
      {children}
    </Text>
  );
}

export function IconButton({ name, label, onPress }: { name: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.iconButton, { backgroundColor: t.surface }]}>
      <Ionicons name={name} size={20} color={t.text} />
    </Pressable>
  );
}

export function SampleBanner() {
  const t = useTheme();
  if (!meta.sample) return null;
  return (
    <View style={[styles.banner, { borderColor: t.amber }]}>
      <T size={12} color={t.amber}>{meta.note}</T>
    </View>
  );
}

export function Screen({ title, subtitle, back, children, scroll = true, footer, hideActions }: { title: string; subtitle?: string; back?: boolean; children: React.ReactNode; scroll?: boolean; footer?: React.ReactNode; hideActions?: boolean }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView edges={back ? ['top', 'bottom'] : ['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={styles.header}>
        {back ? <IconButton name="chevron-back" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
        <View style={{ flex: 1 }}>
          <T size={20} weight="700" lines={1}>{title}</T>
          {subtitle ? <T size={12} color={t.muted} lines={1}>{subtitle}</T> : null}
        </View>
        {hideActions ? null : (
          <>
            {back ? null : <IconButton name="search" label="Search companies" onPress={() => router.push('/screener')} />}
            <IconButton name="chatbubble-ellipses-outline" label="Open research assistant" onPress={() => router.push('/assistant')} />
          </>
        )}
      </View>
      <SampleBanner />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

export function Card({ children, style, gap = 10 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.surface, borderRadius: 14, padding: 14, gap }, style]}>{children}</View>;
}

export function Section({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.between}>
        <T size={15} weight="700">{title}</T>
        {right ? <T size={12} color={t.muted}>{right}</T> : null}
      </View>
      {children}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: t.line }} />;
}

export function Rows({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <Divider /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

export function Row({ title, sub, right, subRight, onPress, rightColor }: { title: string; sub?: string; right?: React.ReactNode; subRight?: string; onPress?: () => void; rightColor?: string }) {
  const t = useTheme();
  const body = (
    <>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="500" lines={1}>{title}</T>
        {sub ? <T size={12} color={t.muted} lines={2}>{sub}</T> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        {typeof right === 'string' ? <T size={13} color={rightColor} style={tabular}>{right}</T> : right}
        {subRight ? <T size={12} color={t.muted} style={tabular}>{subRight}</T> : null}
      </View>
    </>
  );
  if (onPress) return <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>{body}</Pressable>;
  return <View style={styles.row}>{body}</View>;
}

export function Change({ value, size = 13 }: { value: number; size?: number }) {
  const t = useTheme();
  return (
    <T size={size} weight="600" color={value >= 0 ? t.up : t.down} style={tabular}>
      {value >= 0 ? '▲' : '▼'} {signedPct(value)}
    </T>
  );
}

export function Tag({ label, color }: { label: string; color?: string }) {
  const t = useTheme();
  const c = color ?? t.muted;
  return (
    <View style={{ borderWidth: 1, borderColor: c, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <T size={11} color={c}>{label}</T>
    </View>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress} style={[styles.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface }]}>
      <T size={13} weight={on ? '600' : '400'} color={on ? t.accent : t.text}>{label}</T>
    </Pressable>
  );
}

export function Button({ label, onPress, kind = 'primary', icon }: { label: string; onPress: () => void; kind?: 'primary' | 'outline'; icon?: keyof typeof Ionicons.glyphMap }) {
  const t = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, primary ? { backgroundColor: t.accent } : { borderWidth: 1, borderColor: t.line }]}>
      {icon ? <Ionicons name={icon} size={18} color={primary ? t.onAccent : t.text} /> : null}
      <T weight="600" color={primary ? t.onAccent : t.text}>{label}</T>
    </Pressable>
  );
}

export function Bar({ value, color }: { value: number; color?: string }) {
  const t = useTheme();
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: 6, backgroundColor: color ?? t.accent }} />
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 2 }}>
        <T>{label}</T>
        {sub ? <T size={12} color={t.muted}>{sub}</T> : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} trackColor={{ true: t.accent, false: t.surface2 }} thumbColor={value ? t.onAccent : t.muted} />
    </View>
  );
}

export function Bullets({ items, kind }: { items: string[]; kind: 'up' | 'down' | 'risk' }) {
  const t = useTheme();
  const color = kind === 'up' ? t.up : kind === 'down' ? t.down : t.amber;
  const mark = kind === 'up' ? '+' : kind === 'down' ? '−' : '!';
  return (
    <View style={{ gap: 6 }}>
      {items.map((text) => (
        <View key={text} style={{ flexDirection: 'row', gap: 8 }}>
          <T size={13} weight="700" color={color}>{mark}</T>
          <T size={13} style={{ flex: 1 }}>{text}</T>
        </View>
      ))}
    </View>
  );
}

export function ScoreRing({ score }: { score: number }) {
  const t = useTheme();
  const color = score >= 70 ? t.up : score >= 50 ? t.amber : t.down;
  return (
    <View accessibilityLabel={`Research score ${score} of 100`} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 3, borderColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <T size={20} weight="700" style={tabular}>{score}</T>
      <T size={10} color={t.muted} style={{ lineHeight: 12 }}>of 100</T>
    </View>
  );
}

export function ScoreBars({ score }: { score: Score }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {componentKeys.map((k) => (
        <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T size={12} color={t.muted} style={{ width: 96 }}>{componentLabels[k]}</T>
          <View style={{ flex: 1 }}><Bar value={score.parts[k]} /></View>
          <T size={12} style={[tabular, { width: 28, textAlign: 'right' }]}>{score.parts[k]}</T>
        </View>
      ))}
    </View>
  );
}

export function Columns({ values, labels, color, decimals = 0 }: { values: number[]; labels: (string | number)[]; color?: string; decimals?: number }) {
  const t = useTheme();
  const max = Math.max(...values.map((v) => Math.abs(v)), 1);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 92 }}>
        {values.map((v, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
            <T size={11} color={v < 0 ? t.down : t.text} style={tabular}>{decimals ? v.toFixed(decimals) : num(v)}</T>
            <View style={{ width: '100%', height: Math.max(2, (Math.abs(v) / max) * 60), backgroundColor: v < 0 ? t.down : color ?? t.accent, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {labels.map((l) => (
          <T key={String(l)} size={11} color={t.muted} style={{ flex: 1, textAlign: 'center' }}>{l}</T>
        ))}
      </View>
    </View>
  );
}

export function CompanyRow({ c, right, sub }: { c: Company; right?: React.ReactNode; sub?: string }) {
  const router = useRouter();
  return (
    <Row
      title={c.shortName}
      sub={sub ?? `${segmentOf(c)} · ${crore(c.marketCapCr)}`}
      right={right ?? <Change value={c.changePct} />}
      onPress={() => router.push({ pathname: '/stock/[symbol]', params: { symbol: c.symbol } })}
    />
  );
}

export const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  banner: { marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10 },
  content: { padding: 16, gap: 20, paddingBottom: 32 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
