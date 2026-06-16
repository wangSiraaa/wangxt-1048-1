import React from "react";
import { Stall } from "@/types";
import { StallStatus, StallStatusLabel, StallType } from "@/types/enums";
import { StallStatusBadge, StallTypeBadge } from "@/components/common/StatusBadge";
import { Lock, Zap, AlertTriangle, Snowflake } from "lucide-react";
import { useBoxStore } from "@/store/useBoxStore";
import { formatKW } from "@/utils/capacity";

interface Props {
  stall: Stall;
  onClick?: (stall: Stall) => void;
  selected?: boolean;
}

const borderMap: Record<StallStatus, string> = {
  [StallStatus.IDLE]: "border-industrial-200 hover:border-industrial-400",
  [StallStatus.APPLYING]: "border-blue-400",
  [StallStatus.CONNECTED]: "border-emerald-400",
  [StallStatus.SUSPENDED]: "border-red-400",
  [StallStatus.ABNORMAL]: "border-purple-400",
};

const bgMap: Record<StallStatus, string> = {
  [StallStatus.IDLE]: "from-white to-industrial-50/60",
  [StallStatus.APPLYING]: "from-blue-50 to-blue-100/50",
  [StallStatus.CONNECTED]: "from-emerald-50 to-emerald-100/40",
  [StallStatus.SUSPENDED]: "from-red-50 to-red-100/40",
  [StallStatus.ABNORMAL]: "from-purple-50 to-purple-100/40",
};

const iconMap: Record<StallStatus, React.ReactNode> = {
  [StallStatus.IDLE]: <Zap size={12} className="text-industrial-400" />,
  [StallStatus.APPLYING]: <Zap size={12} className="text-blue-500 animate-pulse-soft" />,
  [StallStatus.CONNECTED]: <Zap size={12} className="text-safe-normal" />,
  [StallStatus.SUSPENDED]: <AlertTriangle size={12} className="text-safe-danger" />,
  [StallStatus.ABNORMAL]: <AlertTriangle size={12} className="text-purple-500" />,
};

export default function StallCard({ stall, onClick, selected }: Props) {
  const { boxes = [] } = useBoxStore();
  const box = boxes.find((b) => b.id === stall.distributionBoxId);
  const occupied = stall.occupiedCapacity || 0;
  const rate = stall.ratedCapacity ? occupied / stall.ratedCapacity : 0;

  return (
    <button
      type="button"
      onClick={() => onClick?.(stall)}
      className={`group relative w-full text-left rounded-lg border-2 p-3 transition-all duration-200 bg-gradient-to-br ${bgMap[stall.status]} ${borderMap[stall.status]} ${
        selected ? "ring-2 ring-industrial-600 ring-offset-2 scale-[1.02]" : ""
      } hover:shadow-md active:scale-[0.98] ${stall.locked ? "opacity-95" : ""}`}
      style={{
        animation: selected ? undefined : "fade-in-up 0.5s backwards",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {iconMap[stall.status]}
            <span className="text-xs font-bold text-industrial-800 tracking-wide">
              {stall.code}
            </span>
            {stall.locked && <Lock size={10} className="text-industrial-500" />}
          </div>
          <p className="text-[11px] text-industrial-600 truncate">{stall.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StallTypeBadge type={stall.stallType} />
        </div>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-industrial-500">
          <span>配电箱</span>
          <span className="font-mono text-industrial-700">{box?.code || "-"}</span>
        </div>
        <div className="flex items-center justify-between text-industrial-500">
          <span>额度</span>
          <span className="font-mono text-industrial-700">
            {formatKW(occupied)}/{formatKW(stall.ratedCapacity)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-industrial-100/80 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              rate > 0.9 ? "bg-safe-danger" : rate > 0.7 ? "bg-safe-warning" : "bg-safe-normal"
            }`}
            style={{ width: `${Math.min(100, rate * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-industrial-100/80 flex items-center justify-between">
        <StallStatusBadge status={stall.status} locked={stall.locked} />
        {stall.stallType === StallType.FOOD && (
          <Snowflake size={12} className="text-blue-500/70" aria-label="食品摊位（需冷链设备）" />
        )}
      </div>
    </button>
  );
}
