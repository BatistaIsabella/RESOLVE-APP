import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { ChartInk } from '@/constants/colors';
import { ChartSlice } from '@/utils/metricsAggregator';

interface BarChartProps {
  data: ChartSlice[];
  width: number;
  height?: number;
  color?: string;
}

function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / magnitude) * magnitude;
}

export function BarChart({ data, width, height = 170, color = ChartInk.primary }: BarChartProps) {
  const paddingLeft = 28;
  const paddingBottom = 26;
  const paddingTop = 8;

  const plotWidth = width - paddingLeft - 8;
  const plotHeight = height - paddingBottom - paddingTop;

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, max / 2, max];

  const slotWidth = data.length > 0 ? plotWidth / data.length : plotWidth;
  const barWidth = Math.min(slotWidth * 0.58, 34);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>Sem dados no período</Text>
      </View>
    );
  }

  return (
    <Svg width={width} height={height}>
      {ticks.map((tick) => {
        const y = paddingTop + plotHeight - (tick / max) * plotHeight;
        return (
          <React.Fragment key={tick}>
            <Line
              x1={paddingLeft}
              y1={y}
              x2={paddingLeft + plotWidth}
              y2={y}
              stroke={ChartInk.grid}
              strokeWidth={1}
            />
            <SvgText x={paddingLeft - 6} y={y + 4} fontSize={9} fill={ChartInk.secondary} textAnchor="end">
              {String(Math.round(tick))}
            </SvgText>
          </React.Fragment>
        );
      })}

      {data.map((item, index) => {
        const barHeight = max > 0 ? (item.value / max) * plotHeight : 0;
        const x = paddingLeft + index * slotWidth + (slotWidth - barWidth) / 2;
        const y = paddingTop + plotHeight - barHeight;
        return (
          <React.Fragment key={item.label}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, item.value > 0 ? 2 : 0)}
              // cantos arredondados só na ponta de dados; a base fica na linha zero
              rx={4}
              ry={4}
              fill={color}
            />
            <SvgText
              x={x + barWidth / 2}
              y={height - 8}
              fontSize={9}
              fill={ChartInk.secondary}
              textAnchor="middle"
            >
              {item.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: ChartInk.secondary,
    fontSize: 12,
  },
});
