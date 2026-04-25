'use client';

import * as React from 'react';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  /** Upper bound of the y-axis. Defaults to the max value in `data`. */
  max?: number;
  className?: string;
}

/** Pure-CSS bar chart matching the Claude-Design `.bar-chart` block. */
export function ClinicBarChart({ data, max, className }: BarChartProps) {
  const peak = max ?? Math.max(1, ...data.map((entry) => entry.value));
  return (
    <div className={`bar-chart ${className ?? ''}`} role="img" aria-label="Gráfico de barras">
      {data.map((entry) => {
        const heightPct = Math.max(2, Math.round((entry.value / peak) * 100));
        return (
          <div className="bar-col" key={entry.label}>
            <div
              className="bar-fill"
              style={{ height: `${heightPct}%` }}
              title={`${entry.label}: ${entry.value}`}
            />
            <div className="bar-lbl">{entry.label}</div>
          </div>
        );
      })}
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string | number;
  size?: number;
}

/** SVG donut chart matching the Claude-Design `.donut-wrap` block. */
export function ClinicDonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 96,
}: DonutChartProps) {
  const total = Math.max(
    1,
    segments.reduce((acc, segment) => acc + segment.value, 0)
  );
  let offsetAcc = 0;
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden>
        <circle cx={18} cy={18} r={14} fill="none" stroke="var(--accent)" strokeWidth={5} />
        {segments.map((segment) => {
          const percent = (segment.value / total) * 100;
          const dasharray = `${percent} ${100 - percent}`;
          const dashoffset = -offsetAcc;
          offsetAcc += percent;
          return (
            <circle
              key={segment.label}
              cx={18}
              cy={18}
              r={14}
              fill="none"
              stroke={segment.color}
              strokeWidth={5}
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              pathLength={100}
              strokeLinecap="butt"
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="donut-center">
        <div className="text-base font-semibold tabular-nums tracking-tight">
          {centerValue ?? total}
        </div>
        {centerLabel ? (
          <div className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
            {centerLabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FunnelRow {
  label: string;
  value: number;
}

interface FunnelChartProps {
  rows: FunnelRow[];
}

/** Horizontal funnel chart matching the Claude-Design `.funnel-row` block. */
export function ClinicFunnelChart({ rows }: FunnelChartProps) {
  const peak = Math.max(1, ...rows.map((entry) => entry.value));
  return (
    <div role="img" aria-label="Funnel de conversión">
      {rows.map((row) => {
        const widthPct = Math.max(4, Math.round((row.value / peak) * 100));
        return (
          <div className="funnel-row" key={row.label}>
            <div className="funnel-label">{row.label}</div>
            <div className="funnel-bar-wrap">
              <div
                className="funnel-bar-fill"
                style={{ width: `${widthPct}%` }}
                title={`${row.label}: ${row.value}`}
              >
                {widthPct >= 22 ? row.value : null}
              </div>
            </div>
            <div className="funnel-val">{row.value}</div>
          </div>
        );
      })}
    </div>
  );
}
