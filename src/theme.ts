import { useStore } from '@/store';

export const palettes = {
  dark: {
    bg: '#0D1114', surface: '#161C21', surface2: '#1E262D', line: '#2A343C', text: '#EAF0F4', muted: '#A3B1BD',
    up: '#5CD6A9', down: '#FF9B73', accent: '#7CB8FF', accentSoft: '#14283D', amber: '#F2C14E', onAccent: '#0B1D33',
  },
  light: {
    bg: '#F4F6F8', surface: '#FFFFFF', surface2: '#E9EDF1', line: '#D5DCE2', text: '#131A20', muted: '#55636F',
    up: '#0B7A55', down: '#B8461B', accent: '#1F5FAD', accentSoft: '#DCE9F8', amber: '#8A6100', onAccent: '#FFFFFF',
  },
};
export type Palette = typeof palettes.dark;

export function useTheme(): Palette {
  const { settings } = useStore();
  return palettes[settings.theme];
}
