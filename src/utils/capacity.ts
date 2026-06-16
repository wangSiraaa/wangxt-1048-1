import { DistributionBox, Stall, CapacityBreakdown, CapacityBreakdownItem, ElectricityApplication } from "@/types";
import { ApplicationType, HIGH_LOAD_THRESHOLD, OVERLOAD_THRESHOLD, WarningLevel } from "@/types/enums";

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

export function buildCapacityBreakdown(
  box: DistributionBox,
  stalls: Stall[],
  requestedPower: number,
  applicantStallId: string,
  applications: ElectricityApplication[]
): CapacityBreakdown {
  const boxStalls = stalls.filter((s) => s.distributionBoxId === box.id);
  const currentUsed = calcBoxUsedCapacity(box, stalls);
  const remaining = calcBoxRemainingCapacity(box, stalls);

  const items: CapacityBreakdownItem[] = [];

  boxStalls.forEach((s) => {
    if (s.id === applicantStallId) return;
    if (s.occupiedCapacity > 0) {
      items.push({
        label: `${s.code} ${s.name}`,
        power: s.occupiedCapacity,
        type: "existing",
      });
    }
  });

  const applicantStall = stalls.find((s) => s.id === applicantStallId);
  if (applicantStall && applicantStall.occupiedCapacity > 0) {
    items.push({
      label: `${applicantStall.code} 当前占用`,
      power: applicantStall.occupiedCapacity,
      type: "existing",
    });
  }

  const pendingApps = applications.filter(
    (a) =>
      a.stallId !== applicantStallId &&
      boxStalls.some((s) => s.id === a.stallId) &&
      (a.status === "pending" || a.status === "approved" || a.status === "partially_approved")
  );
  pendingApps.forEach((a) => {
    const stall = stalls.find((s) => s.id === a.stallId);
    const power = a.approvedBoostPower || a.peakPower;
    items.push({
      label: `${stall?.code || "未知"} 待接入(${a.applicationType === ApplicationType.TEMPORARY_BOOST ? "扩容" : "常规"})`,
      power,
      type: "reserved",
    });
  });

  const adjacentStalls = (applicantStall?.adjacentStallIds || [])
    .map((id) => stalls.find((s) => s.id === id))
    .filter((s): s is Stall => !!s && s.distributionBoxId === box.id);

  let adjacentSharedCircuit: string | undefined;
  if (adjacentStalls.length > 0) {
    const adjTotal = adjacentStalls.reduce((s, st) => s + (st.occupiedCapacity || 0), 0);
    if (adjTotal > 0) {
      items.push({
        label: `相邻摊位共用线路(${adjacentStalls.map((s) => s.code).join("+")})`,
        power: adjTotal,
        type: "adjacent_shared",
      });
    }
    adjacentSharedCircuit = `${adjacentStalls.map((s) => s.code).join("、")}与本摊位共用同一配电箱线路，需关注同时高峰叠加风险`;
  }

  items.push({
    label: "本次申请扩容",
    power: requestedPower,
    type: "requested",
  });

  const totalAfterApproval = currentUsed + requestedPower;
  const canFullyApprove = requestedPower <= remaining;
  const maxApprovable = Math.max(0, remaining);

  const available = Math.max(0, box.ratedCapacity - totalAfterApproval);
  if (available > 0) {
    items.push({
      label: "审批后剩余",
      power: available,
      type: "available",
    });
  }

  return {
    boxRated: box.ratedCapacity,
    items,
    totalUsed: totalAfterApproval,
    remainingAfterApproval: available,
    canFullyApprove,
    maxApprovable,
    adjacentSharedCircuit,
  };
}

export function checkDuplicateHighPowerDevices(
  stallId: string,
  newDevices: { deviceName: string; unitPower: number }[],
  applications: ElectricityApplication[],
  stalls: Stall[]
): string[] {
  const stall = stalls.find((s) => s.id === stallId);
  if (!stall || stall.stallType !== "food") return [];

  const warnings: string[] = [];
  const highPowerThreshold = 2.0;

  const existingApps = applications.filter(
    (a) =>
      a.stallId === stallId &&
      a.status !== "rejected" &&
      a.status !== "withdrawn" &&
      a.applicationType !== ApplicationType.TEMPORARY_BOOST
  );

  const existingDeviceNames = new Set<string>();
  existingApps.forEach((app) => {
    app.devices.forEach((d) => {
      if (d.unitPower >= highPowerThreshold) {
        existingDeviceNames.add(d.deviceName);
      }
    });
  });

  newDevices.forEach((d) => {
    if (d.unitPower >= highPowerThreshold && existingDeviceNames.has(d.deviceName)) {
      warnings.push(`设备"${d.deviceName}"已在原有报备中存在(${d.unitPower}kW)，请确认是否为额外新增设备`);
    }
  });

  return warnings;
}
