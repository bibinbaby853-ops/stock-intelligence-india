import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { defaultWeights, type Weights } from '@/lib/score';

export type Watchlist = { id: string; name: string; symbols: string[] };
export const alertKinds = [
  'Quarterly results',
  'Major corporate announcements',
  'Significant changes in financial ratios',
  'Promoter pledging changes',
  'Governance concerns',
  'Research score changes',
  'Watchlist company developments',
] as const;

export type Settings = {
  theme: 'dark' | 'light';
  weights: Weights;
  alerts: Record<string, boolean>;
  biometricLock: boolean;
  backgroundRefresh: boolean;
};

type State = { settings: Settings; watchlists: Watchlist[] };
const initial: State = {
  settings: {
    theme: 'dark',
    weights: defaultWeights,
    alerts: Object.fromEntries(alertKinds.map((k) => [k, true])),
    biometricLock: false,
    backgroundRefresh: true,
  },
  watchlists: [{ id: 'core', name: 'My watchlist', symbols: [] }],
};

type Store = State & {
  ready: boolean;
  setSettings: (patch: Partial<Settings>) => void;
  addList: (name: string) => void;
  removeList: (id: string) => void;
  toggleSymbol: (listId: string, symbol: string) => void;
  isWatched: (symbol: string) => boolean;
};

const Ctx = createContext<Store | null>(null);
const KEY = 'stock-intelligence-india/state/v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<State>;
        setState({
          settings: { ...initial.settings, ...saved.settings, weights: { ...defaultWeights, ...saved.settings?.weights }, alerts: { ...initial.settings.alerts, ...saved.settings?.alerts } },
          watchlists: saved.watchlists?.length ? saved.watchlists : initial.watchlists,
        });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      ready,
      setSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      addList: (name) => update((s) => ({ ...s, watchlists: [...s.watchlists, { id: `list-${Date.now()}`, name, symbols: [] }] })),
      removeList: (id) => update((s) => (s.watchlists.length <= 1 ? s : { ...s, watchlists: s.watchlists.filter((w) => w.id !== id) })),
      toggleSymbol: (listId, symbol) =>
        update((s) => ({
          ...s,
          watchlists: s.watchlists.map((w) => (w.id !== listId ? w : { ...w, symbols: w.symbols.includes(symbol) ? w.symbols.filter((x) => x !== symbol) : [...w.symbols, symbol] })),
        })),
      isWatched: (symbol) => state.watchlists.some((w) => w.symbols.includes(symbol)),
    }),
    [state, ready, update],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider is missing');
  return s;
}
