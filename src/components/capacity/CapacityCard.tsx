import React from "react";
import { DistributionBox, BoxCapacityInfo } from "@/types";
import { formatKW, formatPct, getProgressColorClass, calcBoxUsedCapacity, calcBoxRemainingCapacity, calcBoxUsageRate, getWarningLevel } from "@/utils/capacity";
import { useStallStore } from "@/store/useStallStore";
import { LineStatusBadge } from "@/components/common/StatusBadge";
import { WarningLevel, WarningLevelLabel } from "@/types/enums";
import CapacityGauge from "./CapacityGauge";
import { Zap, Server, AlertTriangle, Flame } from "lucide-react";

export function buildBoxInfo(box: DistributionBox, stalls: ReturnType<typeof useStallStore.getState>["stalls"]): BoxCapacityInfo {
  const used = calcBoxUsedCapacity(box, stalls);
  const remain = calcBoxRemainingCapacity(box, stalls);
  const rate = calcBoxUsageRate(box, stalls);
  const level = getWarningLevel(rate);
  const boxStalls = stalls.filter((s) => s.distributionBoxId === box.id);
  return {
    box,
    usedCapacity: used,
    remainingCapacity: remain,
    usageRate: rate,
    level,
    stallCount: boxStalls.length,
    connectedStallCount: boxStalls.filter((s) => s.status === "connected" || s.status === "suspended").length,
  };
}

interface CardProps {
  info: BoxCapacityInfo;
  compact?: boolean;
}

export default function CapacityCard({ info, compact = false }: CardProps) {
  const { box, usedCapacity, remainingCapacity, usageRate, level, stallCount, connectedStallCount } = info;
  const isWarn = level !== WarningLevel.INFO;

  if (compact) {
    return (
      <div
        className={`rounded-lg border p-3 transition-all hover:shadow-panel ${
          level === WarningLevel.DANGER
            ? "border-safe-danger/40 bg-red-50/40 animate-status-flash"
            : level === WarningLevel.WARNING
            ? "border-safe-warning/40 bg-amber-50/40"
            : "border-industrial-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Server size={14} className={isWarn ? "text-safe-warning" : "text-industrial-500"} />
            <div>
              <div className="text-sm font-semibold text-industrial-800">{box.code}</div>
              <div className="text-[10px] text-industrial-400">{box.location}</div>
            </div>
          </div>
          <LineStatusBadge status={box.lineStatus} />
        </div>
        <div className="progress-bar mb-2 h-2">
          <div
            className={`progress-fill ${getProgressColorClass(usageRate)}`}
            style={{ width: `${Math.min(100, usageRate * 100)}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1 text-[11px] text-center">
          <div>
            <div className="text-industrial-400">额定</div>
            <div className="font-mono font-semibold text-industrial-700">
              {formatKW(box.ratedCapacity)}
            </div>
          </div>
          <div>
            <div className="text-industrial-400">已用</div>
            <div className="font-mono font-semibold text-industrial-600">
              {formatKW(usedCapacity)}
            </div>
          </div>
          <div>
            <div className="text-industrial-400">剩余</div>
            <div className={`font-mono font-semibold ${
              remainingCapacity <= 5 ? "text-safe-danger" : "text-safe-normal"
            }`}>
              {formatKW(remainingCapacity)}
            </div>
          </div>
        </div>
        <div className="text-[10px] text-center text-industrial-400 mt-1.5 pt-1.5 border-t border-industrial-100">
          {connectedStallCount}/{stallCount} 接入 · {formatPct(usageRate)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card p-5 transition-all duration-300 hover:shadow-panel ${
        level === WarningLevel.DANGER ? "border-safe-danger/50 animate-status-flash" : ""
      } ${level === WarningLevel.WARNING ? "border-safe-warning/50" : ""}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isWarn ? "bg-safe-warning/15 text-safe-warning" : "bg-industrial-100 text-industrial-700"
            }`}
          >
            <Server size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-industrial-800 flex items-center gap-2">
              {box.code}
              {isWarn && (
                <AlertTriangle size={14} className={level === WarningLevel.DANGER ? "text-safe-danger" : "text-safe-warning"} />
              )}
            </h4>
            <p className="text-xs text-industrial-500 mt-0.5">{box.location}</p>
          </div>
        </div>
        <LineStatusBadge status={box.lineStatus} />
      </div>

      <div className="flex items-center gap-4 mb-4">
        <CapacityGauge rate={usageRate} size={110} strokeWidth={10} />
        <div className="flex-1 space-y-2 text-sm">
          <div className="flex justify-between items-baseline">
            <span className="text-industrial-500">额定容量</span>
            <span className="font-mono font-semibold text-industrial-800">
              {formatKW(box.ratedCapacity)} <span className="text-xs font-normal text-industrial-500">kW</span>
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-industrial-500">已占用</span>
            <span className="font-mono font-medium text-industrial-700">
              {formatKW(usedCapacity)} kW
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-industrial-500">剩余</span>
            <span className={`font-mono font-semibold ${
              remainingCapacity <= 5 ? "text-safe-danger" : remainingCapacity <= 15 ? "text-safe-warning" : "text-safe-normal"
            }`}>
              {formatKW(remainingCapacity)} kW
            </span>
          </div>
        </div>
      </div>

      <div className="progress-bar mb-3">
        <div
          className={`progress-fill ${getProgressColorClass(usageRate)}`}
          style={{ width: `${Math.min(100, usageRate * 100)}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-industrial-50 text-center">
        <div>
          <p className="text-xs text-industrial-500 mb-1">摊位</p>
          <p className="font-mono font-semibold text-industrial-800 text-sm">
            {stallCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-industrial-500 mb-1">已接入</p>
          <p className="font-mono font-semibold text-safe-normal text-sm">
            {connectedStallCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-industrial-500 mb-1">负载级</p>
          <p className={`font-semibold text-sm ${
            level === WarningLevel.DANGER ? "text-safe-danger" :
            level === WarningLevel.WARNING ? "text-safe-warning" : "text-safe-normal"
          }`}>
            {WarningLevelLabel[level]}
          </p>
        </div>
      </div>
    </div>
  );
}
