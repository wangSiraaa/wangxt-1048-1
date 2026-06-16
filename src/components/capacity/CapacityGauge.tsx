import React from "react";
import { WarningLevel } from "@/types/enums";
import { getWarningLevel, formatPct } from "@/utils/capacity";
import { WarningLevelBadge } from "@/components/common/StatusBadge";

interface Props {
  rate: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function CapacityGauge({
  rate,
  size = 140,
  strokeWidth = 12,
  label,
}: Props) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, rate));
  const offset = circumference * (1 - progress * 0.75);
  const level = getWarningLevel(progress);

  const colorMap: Record<WarningLevel, string> = {
    [WarningLevel.INFO]: "#10b981",
    [WarningLevel.WARNING]: "#f59e0b",
    [WarningLevel.DANGER]: "#ef4444",
  };
  const color = colorMap[level];
  const glow = level !== WarningLevel.INFO;

  const cx = size / 2;
  const cy = size / 2 + 6;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative"
        style={{ width: size, height: size + 16 }}
      >
        <svg width={size} height={size + 16} viewBox={`0 0 ${size} ${size + 16}`}>
          <defs>
            <linearGradient id={`grad-${size}-${Math.round(progress * 1000)}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={color} stopOpacity="0.7" />
            </linearGradient>
          </defs>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={circumference * 0.125}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#grad-${size}-${Math.round(progress * 1000)})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135 ${cx} ${cy})`}
            style={{
              transition: "stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)",
              filter: glow ? `drop-shadow(0 0 6px ${color}88)` : undefined,
            }}
          />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="font-mono font-bold fill-industrial-800"
            style={{ fontSize: size * 0.22 }}
          >
            {formatPct(progress)}
          </text>
          <text
            x={cx}
            y={cy + size * 0.16}
            textAnchor="middle"
            className="fill-industrial-500"
            style={{ fontSize: size * 0.1 }}
          >
            使用率
          </text>
        </svg>
        {glow && (
          <span
            className="absolute -top-1 -right-1 animate-pulse-soft"
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: color,
              boxShadow: `0 0 0 4px ${color}33`,
            }}
          />
        )}
      </div>
      {label && (
        <div className="mt-1">
          <WarningLevelBadge level={level} />
        </div>
      )}
    </div>
  );
}
