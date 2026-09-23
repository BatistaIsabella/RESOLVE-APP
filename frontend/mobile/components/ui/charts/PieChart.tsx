import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { ChartSurface } from '@/constants/colors';

export interface PieDatum {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieDatum[];
  size?: number;
  /** 0 = pizza cheia; > 0 = rosca. Fração do raio (0.6 = rosca do Figma). */
  innerRatio?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angle = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function arcPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);

  if (innerR <= 0) {
    return [
      `M ${cx} ${cy}`,
      `L ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
      'Z',
    ].join(' ');
  }

  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

export function PieChart({ data, size = 180, innerRatio = 0 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * innerRatio;

  if (total <= 0) {
    return (
      <Svg width={size} height={size}>
        <Circle
          cx={cx}
          cy={cy}
          r={outerR}
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth={2}
        />
      </Svg>
    );
  }

  const visible = data.filter((item) => item.value > 0);

  // Uma fatia só: o arco de 360° degenera (início e fim coincidem), então é
  // desenhada como círculo.
  if (visible.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={outerR} fill={visible[0].color} />
        {innerR > 0 ? <Circle cx={cx} cy={cy} r={innerR} fill={ChartSurface} /> : null}
      </Svg>
    );
  }

  // Os ângulos são acumulados antes do render para não mutar nada durante ele.
  const arcs: { label: string; color: string; d: string }[] = [];
  visible.reduce((cursor, item) => {
    const sweep = (item.value / total) * 360;
    arcs.push({
      label: item.label,
      color: item.color,
      d: arcPath(cx, cy, outerR, innerR, cursor, cursor + sweep),
    });
    return cursor + sweep;
  }, 0);

  return (
    <View>
      <Svg width={size} height={size}>
        <G>
          {arcs.map((arc) => (
            <Path
              key={arc.label}
              d={arc.d}
              fill={arc.color}
              // 2px da própria superfície separam fatias vizinhas
              stroke={ChartSurface}
              strokeWidth={2}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}
