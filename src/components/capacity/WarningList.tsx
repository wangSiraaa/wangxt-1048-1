import React from "react";
import { DistributionBox, Stall } from "@/types";
import { WarningLevel, WarningLevelLabel, SuspensionStatus } from "@/types/enums";
import { calcBoxUsageRate, getWarningLevel, formatPct, formatKW } from "@/utils/capacity";
import { WarningLevelBadge, SuspensionStatusBadge } from "@/components/common/StatusBadge";
import { AlertTriangle, AlertCircle, Clock, ZapOff, ChevronRight } from "lucide-react";
import { useInspectionStore } from "@/store/useInspectionStore";
import { useBoxStore } from "@/store/useBoxStore";
import { useStallStore } from "@/store/useStallStore";
import { formatDateTime } from "@/utils/time";

interface ExternalWarning {
  id: string;
  type: "danger" | "warning" | "info";
  icon?: React.ReactNode;
  title: string;
  detail: string;
  time: string;
  tag?: string;
}

interface Props {
  boxes?: DistributionBox[];
  stalls?: Stall[];
  warnings?: ExternalWarning[];
  onJump?: (type: "box" | "stall", id: string) => void;
  compact?: boolean;
}

interface WarningItem {
  key: string;
  type: "capacity" | "suspension" | "abnormal" | "external";
  level: WarningLevel;
  title: string;
  desc: string;
  time: string;
  tag?: string;
  customIcon?: React.ReactNode;
  action?: { label: string; onClick: () => void };
}

export default function WarningList({
  boxes: propsBoxes,
  stalls: propsStalls,
  warnings: externalWarnings,
  onJump,
  compact = false,
}: Props) {
  const { suspensions = [] } = useInspectionStore();
  const { boxes: storeBoxes = [] } = useBoxStore();
  const { stalls: storeStalls = [] } = useStallStore();
  const boxes = propsBoxes ?? storeBoxes;
  const stalls = propsStalls ?? storeStalls;

  const items: WarningItem[] = [];

  // 如果提供了外部 warnings，直接优先使用外部构建好的列表
  if (externalWarnings && externalWarnings.length > 0) {
    externalWarnings.forEach((w) => {
      items.push({
        key: w.id,
        type: "external",
        level:
          w.type === "danger"
            ? WarningLevel.DANGER
            : w.type === "warning"
            ? WarningLevel.WARNING
            : WarningLevel.INFO,
        title: w.title,
        desc: w.detail,
        time: w.time,
        tag: w.tag,
        customIcon: w.icon,
      });
    });
  } else {
    boxes.forEach((b) => {
      const rate = calcBoxUsageRate(b, stalls);
      const level = getWarningLevel(rate);
      if (level === WarningLevel.INFO) return;
      const used = stalls
        .filter((s) => s.distributionBoxId === b.id)
        .reduce((s, st) => s + st.occupiedCapacity, 0);
      items.push({
        key: `box-${b.id}`,
        type: "capacity",
        level,
        title: `配电箱 ${b.code} ${WarningLevelLabel[level]}`,
        desc: `使用率 ${formatPct(rate)}（${formatKW(used)}/${formatKW(
          b.ratedCapacity
        )} kW），请关注并合理调配`,
        time: b.updatedAt,
        tag: "容量预警",
        action: onJump ? { label: "查看", onClick: () => onJump("box", b.id) } : undefined,
      });
    });

    stalls
      .filter((s) => s.status === "suspended")
      .forEach((s) => {
        const susp = suspensions
          .filter(
            (sp) => sp.stallId === s.id && sp.status === SuspensionStatus.SUSPENDED
          )
          .sort((a, b) => String(b.suspendedAt || "").localeCompare(String(a.suspendedAt || "")))[0];
        items.push({
          key: `susp-${s.id}`,
          type: "suspension",
          level: WarningLevel.DANGER,
          title: `摊位 ${s.code} 已暂停供电`,
          desc: susp ? susp.reason : s.name,
          time: susp?.suspendedAt || s.updatedAt,
          tag: "暂停供电",
          action: onJump
            ? { label: "详情", onClick: () => onJump("stall", s.id) }
            : undefined,
        });
      });

    stalls
      .filter((s) => s.status === "abnormal")
      .forEach((s) => {
        items.push({
          key: `abn-${s.id}`,
          type: "abnormal",
          level: WarningLevel.WARNING,
          title: `摊位 ${s.code} 状态异常`,
          desc: `${s.name} 存在异常，请尽快排查`,
          time: s.updatedAt,
          tag: "摊位异常",
          action: onJump
            ? { label: "详情", onClick: () => onJump("stall", s.id) }
            : undefined,
        });
      });

    items.sort((a, b) => {
      const lv = (l: WarningLevel) =>
        l === WarningLevel.DANGER ? 0 : l === WarningLevel.WARNING ? 1 : 2;
      if (lv(a.level) !== lv(b.level)) return lv(a.level) - lv(b.level);
      return String(b.time || "").localeCompare(String(a.time || ""));
    });
  }

  const counts = {
    danger: items.filter((i) => i.level === WarningLevel.DANGER).length,
    warning: items.filter((i) => i.level === WarningLevel.WARNING).length,
  };

  if (compact) {
    return (
      <div className="rounded-lg border border-industrial-150 bg-white">
        <div className="px-3 py-2 border-b border-industrial-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="text-safe-warning" size={14} />
            <span className="text-sm font-semibold text-industrial-700">预警与异常</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            {counts.danger > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-safe-danger font-medium">
                紧急 {counts.danger}
              </span>
            )}
            {counts.warning > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-safe-warning font-medium">
                注意 {counts.warning}
              </span>
            )}
            {items.length === 0 && (
              <span className="text-safe-normal font-medium">✓ 正常</span>
            )}
          </div>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-industrial-400">
              <AlertCircle size={18} className="text-safe-normal mx-auto mb-1" />
              <p>暂无预警</p>
            </div>
          ) : (
            <ul className="divide-y divide-industrial-50">
              {items.map((it) => {
                const bg =
                  it.level === WarningLevel.DANGER
                    ? "hover:bg-red-50/60"
                    : it.level === WarningLevel.WARNING
                    ? "hover:bg-amber-50/50"
                    : "hover:bg-industrial-50";
                return (
                  <li
                    key={it.key}
                    className={`px-3 py-2 ${bg} cursor-pointer transition-colors`}
                    onClick={it.action?.onClick}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center ${
                          it.level === WarningLevel.DANGER
                            ? "bg-red-100 text-safe-danger"
                            : "bg-amber-100 text-safe-warning"
                        }`}
                      >
                        {it.customIcon ||
                          (it.type === "suspension" ? (
                            <ZapOff size={12} />
                          ) : (
                            <AlertCircle size={12} />
                          ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[12px] font-medium text-industrial-800 truncate">
                            {it.title}
                          </span>
                          {it.tag && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-100 text-industrial-500">
                              {it.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-industrial-500 mt-0.5 line-clamp-2">
                          {it.desc}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="font-semibold text-industrial-800 flex items-center gap-2">
            <AlertTriangle className="text-safe-warning" size={18} />
            容量预警与异常
          </h3>
          <p className="text-xs text-industrial-500 mt-0.5">
            超载自动标红，高负载提前提醒
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.danger > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safe-danger/10 text-safe-danger text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-safe-danger animate-pulse-soft" />
              紧急 {counts.danger}
            </span>
          )}
          {counts.warning > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-safe-warning/10 text-safe-warning text-xs font-medium">
              注意 {counts.warning}
            </span>
          )}
          {items.length === 0 && (
            <span className="text-xs text-safe-normal font-medium">✓ 全部正常</span>
          )}
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="p-12 text-center text-industrial-400">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={24} className="text-safe-normal" />
            </div>
            <p className="text-sm">目前无容量预警或异常</p>
            <p className="text-xs mt-1">系统实时监测中</p>
          </div>
        ) : (
          <ol className="relative border-l-2 border-industrial-100 ml-4 my-3 space-y-4">
            {items.map((it, idx) => {
              const color =
                it.level === WarningLevel.DANGER
                  ? "border-safe-danger text-safe-danger"
                  : "border-safe-warning text-safe-warning";
              const icon =
                it.customIcon ||
                (it.type === "suspension" ? (
                  <ZapOff size={12} />
                ) : (
                  <AlertCircle size={12} />
                ));
              return (
                <li
                  key={it.key}
                  className="ml-6 pl-5 relative animate-fade-in-up"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 bg-white ${color} flex items-center justify-center`}
                  >
                    {icon}
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <WarningLevelBadge level={it.level} />
                        {it.tag && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-100 text-industrial-500">
                            {it.tag}
                          </span>
                        )}
                        <p className="text-sm font-medium text-industrial-800">{it.title}</p>
                      </div>
                      <p className="text-xs text-industrial-600 leading-relaxed mb-1">
                        {it.desc}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-industrial-400">
                        <Clock size={10} />
                        {formatDateTime(it.time)}
                      </div>
                    </div>
                    {it.action && (
                      <button
                        type="button"
                        onClick={it.action.onClick}
                        className="shrink-0 flex items-center gap-0.5 text-xs font-medium text-industrial-600 hover:text-industrial-800 transition-colors"
                      >
                        {it.action.label}
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
