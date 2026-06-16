import { DistributionBox, Stall } from "@/types";
import { HIGH_LOAD_THRESHOLD, OVERLOAD_THRESHOLD, WarningLevel } from "@/types/enums";

export function calcBoxUsedCapacity(box: DistributionBox, stalls: Stall[]): number {
  return stalls
    .filter((s) => s.distributionBoxId === box.id)
    .reduce((sum, s) => sum + (s.occupiedCapacity || 0), 0);
}

export function calcBoxRemainingCapacity(box: DistributionBox, stalls: Stall[]): number {
  return Math.max(0, box.ratedCapacity - calcBoxUsedCapacity(box, stalls));
}

export function calcBoxUsageRate(box: DistributionBox, stalls: Stall[]): number {
  if (!box.ratedCapacity) return 0;
  return calcBoxUsedCapacity(box, stalls) / box.ratedCapacity;
}

export function calcBoxUsage(box: DistributionBox, stalls: Stall[]) {
  return {
    used: calcBoxUsedCapacity(box, stalls),
    remaining: calcBoxRemainingCapacity(box, stalls),
    rate: calcBoxUsageRate(box, stalls),
  };
}

export function getWarningLevel(usageRate: number): WarningLevel {
  if (usageRate >= OVERLOAD_THRESHOLD) return WarningLevel.DANGER;
  if (usageRate >= HIGH_LOAD_THRESHOLD) return WarningLevel.WARNING;
  return WarningLevel.INFO;
}

export function formatKW(val: number): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "0";
  return val.toFixed(2);
}

export function formatPct(val: number): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "0%";
  return `${(val * 100).toFixed(1)}%`;
}

export function getProgressColorClass(usageRate: number): string {
  const level = getWarningLevel(usageRate);
  switch (level) {
    case WarningLevel.DANGER:
      return "bg-gradient-to-r from-red-500 to-safe-danger";
    case WarningLevel.WARNING:
      return "bg-gradient-to-r from-amber-400 to-safe-warning";
    default:
      return "bg-gradient-to-r from-emerald-400 to-safe-normal";
  }
}
