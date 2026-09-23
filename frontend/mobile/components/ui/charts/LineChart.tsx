import React from 'react';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { ChartInk } from '@/constants/colors';
import { ChartSlice } from '@/utils/metricsAggregator';

interface LineChartProps {
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

export function LineChart({ data, width, height = 170, color = ChartInk.primary }: LineChartProps) {
  const paddingLeft = 28;
  const paddingBottom = 26;
  const paddingTop = 10;

  const plotWidth = width - paddingLeft - 12;
  const plotHeight = height - paddingBottom - paddingTop;

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const ticks = [0, max / 2, max];

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;
  const pointAt = (index: number, value: number) => ({
    x: paddingLeft + index * stepX,
    y: paddingTop + plotHeight - (max > 0 ? (value / max) * plotHeight : 0),
  });

  const points = data.map((item, index) => pointAt(index, item.value));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

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

      <Polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {points.map((point, index) => (
        <Circle
          key={data[index].label + index}
          cx={point.x}
          cy={point.y}
          r={4}
          fill={color}
          // anel da própria superfície onde o marcador encosta na linha
          stroke={ChartInk.grid}
          strokeWidth={2}
        />
      ))}

      {data.map((item, index) => (
        <SvgText
          key={item.label + index}
          x={points[index].x}
          y={height - 8}
          fontSize={9}
          fill={ChartInk.secondary}
          textAnchor="middle"
        >
          {item.label}
        </SvgText>
      ))}
    </Svg>
  );
}
