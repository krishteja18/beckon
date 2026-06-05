import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  /** Completion percent, 0–100 */
  percent: number;
  /** Outer diameter in px (default 36) */
  size?: number;
  /** Stroke width (default 3.5) */
  stroke?: number;
  /** Override colors for the filled and track portions */
  trackColor?: string;
  fillColor?: string;
  /** Override the label inside (defaults to the percentage without %) */
  label?: string;
  /** Hide the percentage label (just show the ring) */
  hideLabel?: boolean;
}

/**
 * Static completion ring — NOT a streak counter, NOT animated growth.
 * Just a calm read-only visualization of "this month so far".
 *
 * Uses react-native-svg (works on web with no WASM dependency, unlike Skia).
 * Design intent: present, not aspirational. Never reset to 0. No celebrations.
 */
export function CompletionRing({
  percent,
  size = 36,
  stroke = 3.5,
  trackColor = 'rgba(108, 93, 211, 0.12)',
  fillColor = '#6C5DD3',
  label,
  hideLabel = false,
}: Props) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safePercent / 100);

  const displayLabel = label ?? `${Math.round(safePercent)}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        {/* Filled arc — rotate -90° so it starts at 12 o'clock */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {!hideLabel && (
        <Text
          style={{
            color: '#1E1B4B',
            fontSize: size * 0.28,
            fontFamily: 'Inter_600SemiBold',
            letterSpacing: -0.2,
          }}
        >
          {displayLabel}
        </Text>
      )}
    </View>
  );
}
