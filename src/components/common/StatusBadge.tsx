import React from "react";
import { StallStatus, ApplicationStatus, LineStatus, WarningLevel, StallType, InspectionResult, SuspensionStatus } from "@/types/enums";

export function StallStatusBadge({ status, locked }: { status: StallStatus; locked?: boolean }) {
  const map: Record<StallStatus, { cls: string; label: string }> = {
    [StallStatus.IDLE]: { cls: "badge-idle", label: "空闲" },
    [StallStatus.APPLYING]: { cls: "badge-applying", label: "申请中" },
    [StallStatus.CONNECTED]: { cls: "badge-connected", label: "已接电" },
    [StallStatus.SUSPENDED]: { cls: "badge-suspended", label: "已暂停" },
    [StallStatus.ABNORMAL]: { cls: "badge-abnormal", label: "异常" },
  };
  const item = map[status] || map[StallStatus.IDLE];
  return (
    <span className={item.cls}>
      {item.label}
      {locked && <span className="opacity-70 ml-1">🔒</span>}
    </span>
  );
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const map: Record<ApplicationStatus, { cls: string; label: string }> = {
    [ApplicationStatus.PENDING]: { cls: "badge-applying", label: "待审批" },
    [ApplicationStatus.APPROVED]: { cls: "badge-approved", label: "已通过" },
    [ApplicationStatus.REJECTED]: { cls: "badge-rejected", label: "已驳回" },
    [ApplicationStatus.WITHDRAWN]: { cls: "badge-withdrawn", label: "已撤回" },
    [ApplicationStatus.CONNECTED]: { cls: "badge-connected", label: "已接电" },
  };
  const item = map[status] || map[ApplicationStatus.PENDING];
  return <span className={item.cls}>{item.label}</span>;
}

export function LineStatusBadge({ status }: { status: LineStatus }) {
  const map: Record<LineStatus, { cls: string; label: string }> = {
    [LineStatus.NORMAL]: { cls: "badge-connected", label: "正常" },
    [LineStatus.ABNORMAL]: { cls: "badge-suspended", label: "异常" },
    [LineStatus.MAINTENANCE]: { cls: "badge-applying", label: "维护中" },
  };
  const item = map[status] || map[LineStatus.NORMAL];
  return <span className={item.cls}>{item.label}</span>;
}

export function WarningLevelBadge({ level }: { level: WarningLevel }) {
  const map: Record<WarningLevel, { cls: string; label: string }> = {
    [WarningLevel.INFO]: { cls: "badge-idle", label: "正常" },
    [WarningLevel.WARNING]: { cls: "badge-approved", label: "高负载" },
    [WarningLevel.DANGER]: { cls: "badge-suspended", label: "超载" },
  };
  const item = map[level] || map[WarningLevel.INFO];
  return <span className={item.cls}>{item.label}</span>;
}

export function StallTypeBadge({ type }: { type: StallType }) {
  const map: Record<StallType, { cls: string; label: string }> = {
    [StallType.NORMAL]: { cls: "badge-idle", label: "普通" },
    [StallType.FOOD]: { cls: "badge-applying", label: "食品" },
  };
  const item = map[type] || map[StallType.NORMAL];
  return <span className={item.cls}>{item.label}</span>;
}

export function InspectionResultBadge({ result }: { result: InspectionResult }) {
  const map: Record<InspectionResult, { cls: string; label: string }> = {
    [InspectionResult.NORMAL]: { cls: "badge-connected", label: "合格" },
    [InspectionResult.ABNORMAL]: { cls: "badge-suspended", label: "异常" },
  };
  const item = map[result] || map[InspectionResult.NORMAL];
  return <span className={item.cls}>{item.label}</span>;
}

export function SuspensionStatusBadge({ status }: { status: SuspensionStatus }) {
  const map: Record<SuspensionStatus, { cls: string; label: string }> = {
    [SuspensionStatus.SUSPENDED]: { cls: "badge-suspended", label: "暂停中" },
    [SuspensionStatus.RESTORED]: { cls: "badge-connected", label: "已恢复" },
  };
  const item = map[status] || map[SuspensionStatus.RESTORED];
  return <span className={item.cls}>{item.label}</span>;
}
