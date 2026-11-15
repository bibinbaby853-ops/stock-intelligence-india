import * as LocalAuthentication from 'expo-local-authentication';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Card, Divider, Rows, Screen, Section, T, ToggleRow, tabular } from '@/components/ui';
import { companies, meta } from '@/data';
import { longDate } from '@/lib/metrics';
import { componentKeys, componentLabels, defaultWeights } from '@/lib/score';
import { alertKinds, useStore } from '@/store';
import { useTheme } from '@/theme';

export default function Profile() {
  const t = useTheme();
  const { settings, setSettings } = useStore();
  const weightTotal = componentKeys.reduce((s, k) => s + settings.weights[k], 0);

  const setLock = async (on: boolean) => {
    if (!on) return setSettings({ biometricLock: false });
    const available = (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    if (!available) {
      Alert.alert('Biometric lock is not available', 'Set up a fingerprint or face unlock in the phone settings first.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirm to turn on the lock' });
    if (result.success) setSettings({ biometricLock: true });
  };
  const step = (key: (typeof componentKeys)[number], by: number) => setSettings({ weights: { ...settings.weights, [key]: Math.max(0, Math.min(60, settings.weights[key] + by)) } });

  return (
    <Screen title="Profile" subtitle="Settings and preferences">
      <Section title="Appearance">
        <Card gap={0}>
          <ToggleRow label="Dark mode" sub="Default theme" value={settings.theme === 'dark'} onChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })} />
        </Card>
      </Section>

      <Section title="Research scoring preferences" right={`Weights total ${weightTotal}`}>
        <Card gap={0}>
          {componentKeys.map((k, i) => (
            <View key={k}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 }}>
                <T style={{ flex: 1 }}>{componentLabels[k]}</T>
                <Stepper label={`Lower the weight of ${componentLabels[k]}`} text="−" onPress={() => step(k, -5)} />
                <T weight="700" style={[tabular, { width: 28, textAlign: 'center' }]}>{settings.weights[k]}</T>
                <Stepper label={`Raise the weight of ${componentLabels[k]}`} text="+" onPress={() => step(k, 5)} />
              </View>
            </View>
          ))}
          <Divider />
          <Pressable accessibilityRole="button" onPress={() => setSettings({ weights: defaultWeights })} style={{ minHeight: 48, justifyContent: 'center' }}>
            <T color={t.accent} weight="600">Restore default weights</T>
          </Pressable>
        </Card>
        <T size={12} color={t.muted}>Changing a weight recalculates every research score in the application. Weights are applied in proportion, so they need not add up to 100.</T>
      </Section>

      <Section title="Notification preferences">
        <Card gap={0}>
          <Rows>
            {alertKinds.map((k) => (
              <ToggleRow key={k} label={k} value={!!settings.alerts[k]} onChange={(v) => setSettings({ alerts: { ...settings.alerts, [k]: v } })} />
            ))}
          </Rows>
        </Card>
        <T size={12} color={t.muted}>Your choices are saved. Notifications begin arriving once the data service is connected in a later build.</T>
      </Section>

      <Section title="Data">
        <Card gap={0}>
          <Rows>
            <View style={{ paddingVertical: 10, gap: 2 }}>
              <T>Data in this build</T>
              <T size={12} color={t.muted}>
                {meta.sample ? 'Built-in sample data set with fictional companies.' : 'Official exchange data.'} {companies.length} companies, as of {longDate(meta.priceAsOf)}.
              </T>
            </View>
            <ToggleRow label="Background refresh" sub="Takes effect once the data service is connected" value={settings.backgroundRefresh} onChange={(v) => setSettings({ backgroundRefresh: v })} />
            <View style={{ paddingVertical: 10, gap: 2 }}>
              <T>Export reports</T>
              <T size={12} color={t.muted}>Open any company and tap "Export report" to create and share a research report file.</T>
            </View>
          </Rows>
        </Card>
      </Section>

      <Section title="Account security">
        <Card gap={0}>
          <ToggleRow label="Biometric app lock" sub="Fingerprint or face unlock when the application opens" value={settings.biometricLock} onChange={setLock} />
        </Card>
        <T size={12} color={t.muted}>Watchlists and settings are stored only on this phone. There is no account or password in this build.</T>
      </Section>
    </Screen>
  );
}

function Stepper({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
      <T size={18}>{text}</T>
    </Pressable>
  );
}
