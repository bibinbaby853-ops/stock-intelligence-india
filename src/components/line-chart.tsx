import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { useTheme } from '@/theme';

export function LineChart({ values, height = 150, color }: { values: number[]; height?: number; color: string }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 6;
  const points = values
    .map((v, i) => {
      const x = values.length > 1 ? (i / (values.length - 1)) * width : 0;
      const y = pad + (1 - (v - min) / span) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <View accessibilityRole="image" accessibilityLabel="Price chart for the selected period" style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={t.line} strokeWidth={1} />
          ))}
          <Polyline points={points} fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}
