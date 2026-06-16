import React, { useMemo } from "react";
import { Stall, DistributionBox } from "@/types";
import StallCard from "./StallCard";
import { Zap } from "lucide-react";
import { LineStatusBadge } from "@/components/common/StatusBadge";
import { calcBoxUsageRate, formatKW, getWarningLevel } from "@/utils/capacity";
import { WarningLevel, WarningLevelLabel } from "@/types/enums";
import { useStallStore } from "@/store/useStallStore";
import { useBoxStore } from "@/store/useBoxStore";

interface Props {
  stalls?: Stall[];
  boxes?: DistributionBox[];
  onSelect?: (stall: Stall) => void;
  onSelectStall?: (stall: Stall) => void;
  selectedStallId?: string;
  filterLocked?: boolean;
  compact?: boolean;
}

export default function StallGrid({
  stalls: propsStalls,
  boxes: propsBoxes,
  onSelect,
  onSelectStall,
  selectedStallId,
  compact = false,
}: Props) {
  const { stalls: storeStalls = [] } = useStallStore();
  const { boxes: storeBoxes = [] } = useBoxStore();
  const stalls = propsStalls ?? storeStalls;
  const boxes = propsBoxes ?? storeBoxes;
  const handleSelect = (s: Stall) => {
    onSelect?.(s);
    onSelectStall?.(s);
  };
  const grouped = useMemo(() => {
    return boxes.map((box) => ({
      box,
      items: stalls.filter((s) => s.distributionBoxId === box.id),
    })).filter((g) => g.items.length > 0);
  }, [boxes, stalls]);

  return (
    <div className="space-y-6">
      {grouped.map(({ box, items }) => {
        const rate = calcBoxUsageRate(box, stalls);
        const level = getWarningLevel(rate);
        const warnStyle =
          level === WarningLevel.DANGER
            ? "border-safe-danger/40 bg-red-50/40"
            : level === WarningLevel.WARNING
            ? "border-safe-warning/40 bg-amber-50/40"
            : "border-industrial-200 bg-white";

        return (
          <div
            key={box.id}
            className={`rounded-xl border p-5 transition-all ${warnStyle}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-dashed border-industrial-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    level === WarningLevel.DANGER
                      ? "bg-safe-danger/15 text-safe-danger"
                      : level === WarningLevel.WARNING
                      ? "bg-safe-warning/15 text-safe-warning"
                      : "bg-industrial-100 text-industrial-700"
                  }`}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-industrial-800 flex items-center gap-2">
                    配电箱 {box.code}
                    <LineStatusBadge status={box.lineStatus} />
                  </h4>
                  <p className="text-xs text-industrial-500 mt-0.5">
                    {box.location} · 负载级：
                    <span
                      className={`ml-1 font-medium ${
                        level === WarningLevel.DANGER
                          ? "text-safe-danger"
                          : level === WarningLevel.WARNING
                          ? "text-safe-warning"
                          : "text-safe-normal"
                      }`}
                    >
                      {WarningLevelLabel[level]}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <div className="text-right">
                  <p className="text-xs text-industrial-500">额定容量</p>
                  <p className="font-mono font-semibold text-industrial-800">
                    {formatKW(box.ratedCapacity)} kW
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-industrial-500">摊位数量</p>
                  <p className="font-mono font-semibold text-industrial-800">
                    {items.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {items
                .sort((a, b) => String(a.code || "").localeCompare(String(b.code || "")))
                .map((s) => (
                  <StallCard
                    key={s.id}
                    stall={s}
                    onClick={handleSelect}
                    selected={selectedStallId === s.id}
                  />
                ))}
            </div>
          </div>
        );
      })}
      {grouped.length === 0 && (
        <div className="card p-10 text-center text-industrial-500">
          暂无摊位数据
        </div>
      )}
    </div>
  );
}
