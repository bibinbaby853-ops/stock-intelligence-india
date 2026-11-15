import * as LocalAuthentication from 'expo-local-authentication';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button, T } from '@/components/ui';
import { StoreProvider, useStore } from '@/store';
import { useTheme } from '@/theme';

function Gate({ children }: { children: React.ReactNode }) {
  const { settings, ready } = useStore();
  const t = useTheme();
  const [unlocked, setUnlocked] = useState(false);

  const unlock = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Stock Intelligence India' });
      if (result.success) setUnlocked(true);
    } catch {
      // Stay locked; the person can try again.
    }
  }, []);

  useEffect(() => {
    if (ready && settings.biometricLock && !unlocked) unlock();
  }, [ready, settings.biometricLock, unlocked, unlock]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (settings.biometricLock && !unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
        <T size={20} weight="700">Stock Intelligence India</T>
        <T color={t.muted}>The application is locked.</T>
        <Button label="Unlock" icon="finger-print" onPress={unlock} />
      </View>
    );
  }
  return <>{children}</>;
}

function Shell() {
  const { settings } = useStore();
  const t = useTheme();
  return (
    <Gate>
      <StatusBar style={settings.theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </Gate>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
