import React, { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Clock,
  FileText,
  Gauge,
  Grid3x3,
  Info,
  TrendingDown,
  TrendingUp,
  Zap,
  RefreshCw,
  Eye,
  MapPin,
  PieChart as PieChartIcon,
} from "lucide-react";
import { useBoxStore } from "@/store/useBoxStore";
import { useStallStore } from "@/store/useStallStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useInspectionStore } from "@/store/useInspectionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/common/Toast";
import Modal from "@/components/common/Modal";
import {
  LineStatusBadge,
  StallStatusBadge,
  StallTypeBadge,
  SuspensionStatusBadge,
  WarningLevelBadge,
} from "@/components/common/StatusBadge";
import CapacityCard, { buildBoxInfo } from "@/components/capacity/CapacityCard";
import { BoxCapacityInfo } from "@/types";
import WarningList from "@/components/capacity/WarningList";
import StallGrid from "@/components/stall/StallGrid";
import {
  WarningLevel,
  HIGH_LOAD_THRESHOLD,
  OVERLOAD_THRESHOLD,
  StallStatus,
  SuspensionStatus,
  ApplicationStatus,
} from "@/types/enums";
import { DistributionBox, Stall, CapacityWarning } from "@/types";
import {
  calcBoxRemainingCapacity,
  calcBoxUsage,
  formatKW,
} from "@/utils/capacity";
import { formatDateTime } from "@/utils/time";
import { genId } from "@/utils/id";

type TabKey = "overview" | "boxes" | "timeline";

export default function CapacityMonitor() {
  return <CapacityMonitorInner />;
}

function CapacityMonitorInner() {
  const toast = useToast();
  const { boxes = [] } = useBoxStore();
  const { stalls = [] } = useStallStore();
  const { applications = [] } = useApplicationStore();
  const { suspensions = [], inspections = [] } = useInspectionStore();

  const [tab, setTab] = useState<TabKey>("overview");
  const [selectedBox, setSelectedBox] = useState<BoxCapacityInfo | null>(null);

  const boxInfos = useMemo(
    () =>
      boxes
        .map((b) => buildBoxInfo(b, stalls))
        .sort((a, b) => b.usageRate - a.usageRate),
    [boxes, stalls]
  );

  const warnings = useMemo(() => buildWarnings(boxInfos, suspensions, inspections, stalls), [
    boxInfos,
    suspensions,
    inspections,
    stalls,
  ]);

  // 全局统计
  const totalRated = boxInfos.reduce((s, b) => s + b.box.ratedCapacity, 0);
  const totalUsed = boxInfos.reduce((s, b) => s + b.usedCapacity, 0);
  const totalRemaining = totalRated - totalUsed;
  const globalRate = totalRated > 0 ? totalUsed / totalRated : 0;

  const warningCount = warnings.filter((w) => w.type === "warning").length;
  const dangerCount = warnings.filter((w) => w.type === "danger").length;
  const suspendCount = suspensions.filter((s) => s.status === SuspensionStatus.SUSPENDED).length;

  const connectedStalls = stalls.filter((s) => s.status === StallStatus.CONNECTED);
  const applyingStalls = stalls.filter((s) => s.status === StallStatus.APPLYING);
  const abnormalStalls = stalls.filter(
    (s) => s.status === StallStatus.SUSPENDED || s.status === StallStatus.ABNORMAL
  );

  // 摊位使用率分布
  const stallDistribution = useMemo(() => {
    const dist = { normal: 0, high: 0, overload: 0 };
    connectedStalls.forEach((s) => {
      const rate = s.ratedCapacity > 0 ? s.occupiedCapacity / s.ratedCapacity : 0;
      if (rate > OVERLOAD_THRESHOLD) dist.overload++;
      else if (rate > HIGH_LOAD_THRESHOLD) dist.high++;
      else dist.normal++;
    });
    return dist;
  }, [connectedStalls]);

  function handleRefresh() {
    toast.info("容量数据已刷新");
  }

  const currentBoxInfo = selectedBox
    ? boxInfos.find((b) => b.box.id === selectedBox.box.id) || selectedBox
    : null;

  return (
    <div className="space-y-6">
      {/* 顶部头部 */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-industrial-800">容量监控中心</h2>
              <p className="text-xs text-industrial-500 mt-0.5">
                全局配电容量实时监控、预警汇总、趋势分析
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-ghost text-xs"
            >
              <RefreshCw size={14} /> 刷新数据
            </button>
            <div className="text-xs text-industrial-400 flex items-center gap-1">
              <Clock size={12} />
              {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* 全局容量大屏 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          <div className="lg:col-span-2 stat-card bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 text-white rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-8 -mb-8" />
            <div className="relative">
              <div className="text-xs text-white/60 mb-1">全局配电总容量</div>
              <div className="text-4xl font-black font-mono tracking-tight">
                {formatKW(totalRated)}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="text-xs text-white/60">已使用</div>
                  <div className="text-lg font-semibold">{formatKW(totalUsed)}</div>
                </div>
                <div>
                  <div className="text-xs text-white/60 text-right">剩余</div>
                  <div
                    className={`text-lg font-semibold ${
                      totalRemaining < totalRated * (1 - OVERLOAD_THRESHOLD)
                        ? "text-red-300"
                        : "text-green-300"
                    }`}
                  >
                    {formatKW(totalRemaining)}
                  </div>
                </div>
              </div>
              <div className="mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    globalRate > OVERLOAD_THRESHOLD
                      ? "bg-gradient-to-r from-orange-400 to-red-500"
                      : globalRate > HIGH_LOAD_THRESHOLD
                      ? "bg-gradient-to-r from-yellow-400 to-orange-400"
                      : "bg-gradient-to-r from-green-400 to-blue-400"
                  }`}
                  style={{ width: `${Math.min(globalRate * 100, 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-white/60 flex justify-between">
                <span>负载率</span>
                <span className="font-semibold text-white/90">
                  {(globalRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <StatTile
            icon={<Grid3x3 size={16} />}
            color="info"
            label="摊位总数"
            value={stalls.length.toString()}
            sub={`已接入 ${connectedStalls.length} / 申请中 ${applyingStalls.length}`}
          />
          <StatTile
            icon={<Gauge size={16} />}
            color={dangerCount > 0 ? "danger" : warningCount > 0 ? "warning" : "success"}
            label="容量预警"
            value={`${warningCount + dangerCount}`}
            sub={`高负载 ${warningCount} / 超载 ${dangerCount}`}
            highlight={dangerCount > 0}
          />
          <StatTile
            icon={<AlertTriangle size={16} />}
            color={abnormalStalls.length > 0 ? "danger" : "success"}
            label="异常摊位"
            value={abnormalStalls.length.toString()}
            sub={`暂停 ${suspendCount} 个`}
            highlight={suspendCount > 0}
          />
          <StatTile
            icon={<FileText size={16} />}
            color="secondary"
            label="巡检记录"
            value={inspections.length.toString()}
            sub={`异常 ${
              inspections.filter((i) => i.inspectionResult === "abnormal").length
            } 次`}
          />
          <StatTile
            icon={<Zap size={16} />}
            color="success"
            label="配电箱数量"
            value={boxes.length.toString()}
            sub={`正常 ${
              boxes.filter((b) => b.lineStatus === "normal").length
            } / 异常 ${boxes.filter((b) => b.lineStatus !== "normal").length}`}
          />
        </div>

        {/* 摊位负载分布条 */}
        <div className="p-4 bg-industrial-50/80 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-industrial-600 flex items-center gap-2">
              <PieChartIcon size={14} /> 已接入摊位负载率分布
            </div>
            <div className="text-xs text-industrial-500">
              共 {connectedStalls.length} 个摊位
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <DistributionBar
              label="正常范围"
              count={stallDistribution.normal}
              total={connectedStalls.length}
              color="bg-safe-success"
              desc={`≤${(HIGH_LOAD_THRESHOLD * 100).toFixed(0)}%`}
            />
            <DistributionBar
              label="高负载"
              count={stallDistribution.high}
              total={connectedStalls.length}
              color="bg-safe-warning"
              desc={`${(HIGH_LOAD_THRESHOLD * 100).toFixed(0)}-${(OVERLOAD_THRESHOLD * 100).toFixed(0)}%`}
            />
            <DistributionBar
              label="超载"
              count={stallDistribution.overload}
              total={connectedStalls.length}
              color="bg-safe-danger"
              desc={`>${(OVERLOAD_THRESHOLD * 100).toFixed(0)}%`}
            />
          </div>
        </div>

        <div className="tabs mt-4">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={tab === "overview" ? "tab-active" : "tab-inactive"}
          >
            <BarChart3 size={14} /> 监控总览
          </button>
          <button
            type="button"
            onClick={() => setTab("boxes")}
            className={tab === "boxes" ? "tab-active" : "tab-inactive"}
          >
            <Gauge size={14} /> 配电箱明细
          </button>
          <button
            type="button"
            onClick={() => setTab("timeline")}
            className={tab === "timeline" ? "tab-active" : "tab-inactive"}
          >
            <Bell size={14} /> 预警与异常时间线
          </button>
        </div>
      </div>

      {tab === "overview" && (
        <OverviewTab
          boxInfos={boxInfos}
          warnings={warnings}
          applications={applications}
          onSelectBox={setSelectedBox}
        />
      )}

      {tab === "boxes" && (
        <BoxesTab boxInfos={boxInfos} stalls={stalls} onSelect={setSelectedBox} />
      )}

      {tab === "timeline" && <TimelineTab warnings={warnings} />}

      {currentBoxInfo && (
        <BoxDetailModal
          info={currentBoxInfo}
          stalls={stalls.filter(
            (s) => s.distributionBoxId === currentBoxInfo.box.id
          )}
          applications={applications.filter(
            (a) =>
              stalls.find((s) => s.id === a.stallId)?.distributionBoxId ===
              currentBoxInfo.box.id
          )}
          onClose={() => setSelectedBox(null)}
        />
      )}
    </div>
  );
}

function StatTile({
  icon,
  color,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  color: "info" | "success" | "warning" | "danger" | "secondary";
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    info: {
      bg: "from-blue-50 to-white",
      text: "text-safe-info",
      border: "border-safe-info",
    },
    success: {
      bg: "from-green-50 to-white",
      text: "text-safe-success",
      border: "border-safe-success",
    },
    warning: {
      bg: "from-yellow-50 to-white",
      text: "text-safe-warning",
      border: "border-safe-warning",
    },
    danger: {
      bg: "from-red-50 to-white",
      text: "text-safe-danger",
      border: "border-safe-danger",
    },
    secondary: {
      bg: "from-purple-50 to-white",
      text: "text-purple-600",
      border: "border-purple-400",
    },
  };
  const c = colorMap[color];
  return (
    <div
      className={`stat-card bg-gradient-to-br ${c.bg} border-l-4 ${c.border} ${
        highlight ? "animate-pulse-soft" : ""
      }`}
    >
      <div className={`flex items-center gap-2 mb-1 ${c.text}`}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-industrial-800">{value}</div>
      {sub && <div className="text-xs text-industrial-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function DistributionBar({
  label,
  count,
  total,
  color,
  desc,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  desc: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="bg-white rounded-lg p-2.5 border border-industrial-100">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-industrial-700">{label}</span>
        <span className="text-xs text-industrial-400">{desc}</span>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-xl font-bold text-industrial-800">{count}</div>
        <div className="text-xs text-industrial-400 pb-0.5">
          {total > 0 ? `${pct.toFixed(0)}%` : "-"}
        </div>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-industrial-100 overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OverviewTab({
  boxInfos,
  warnings,
  applications,
  onSelectBox,
}: {
  boxInfos: BoxCapacityInfo[];
  warnings: any[];
  applications: any[];
  onSelectBox: (b: BoxCapacityInfo) => void;
}) {
  const pendingApps = applications
    .filter((a) => a.status === ApplicationStatus.PENDING)
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左：配电箱容量 + 摊位图 */}
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gauge size={16} /> 配电箱容量分布
            </span>
            <span className="text-xs font-normal text-industrial-400">
              点击卡片查看详情
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boxInfos.map((bi) => (
              <div
                key={bi.box.id}
                onClick={() => onSelectBox(bi)}
                className="cursor-pointer transition-transform hover:-translate-y-0.5"
              >
                <CapacityCard key={bi.box.id} info={bi} />
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
            <Grid3x3 size={16} /> 摊位实时状态全景
          </h3>
          <StallGrid
            onSelect={() => {}}
            compact
          />
        </div>
      </div>

      {/* 右：预警列表 + 待办 */}
      <div className="space-y-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-3 flex items-center gap-2">
            <Bell size={16} /> 实时预警与异常
          </h3>
          <WarningList warnings={warnings.slice(0, 12)} compact />
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-3 flex items-center gap-2">
            <Clock size={16} /> 待处理申请（容量占用影响）
          </h3>
          {pendingApps.length === 0 ? (
            <div className="text-center py-6 text-industrial-400 text-sm">
              暂无待处理申请
            </div>
          ) : (
            <div className="space-y-2">
              {pendingApps.map((a) => {
                const powerPct = boxInfos.length
                  ? (a.peakPower / boxInfos[0].box.ratedCapacity) * 100
                  : 0;
                return (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg border border-industrial-100 bg-white"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-industrial-800">
                        {a.merchantName}
                      </span>
                      <span className="text-xs text-industrial-400">
                        {formatDateTime(a.createdAt).slice(5, 16)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-industrial-500">占用</span>
                      <span className="text-sm font-semibold text-safe-info">
                        +{formatKW(a.peakPower)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-industrial-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
                        style={{ width: `${Math.min(powerPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoxesTab({
  boxInfos,
  stalls,
  onSelect,
}: {
  boxInfos: BoxCapacityInfo[];
  stalls: Stall[];
  onSelect: (b: BoxCapacityInfo) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>配电箱</th>
                <th>位置</th>
                <th>线路状态</th>
                <th>额定容量</th>
                <th>已使用</th>
                <th>剩余容量</th>
                <th>使用率</th>
                <th>预警等级</th>
                <th>摊位（接入/总数）</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {boxInfos.map((bi) => {
                const boxStalls = stalls.filter(
                  (s) => s.distributionBoxId === bi.box.id
                );
                const connected = boxStalls.filter(
                  (s) => s.status === StallStatus.CONNECTED
                ).length;
                return (
                  <tr
                    key={bi.box.id}
                    className={
                      bi.level === WarningLevel.DANGER
                        ? "bg-red-50/30"
                        : bi.level === WarningLevel.WARNING
                        ? "bg-yellow-50/30"
                        : ""
                    }
                  >
                    <td>
                      <div className="font-semibold text-industrial-800">
                        {bi.box.code}
                      </div>
                      {bi.box.description && (
                        <div className="text-xs text-industrial-400 mt-0.5">
                          {bi.box.description}
                        </div>
                      )}
                    </td>
                    <td className="text-sm text-industrial-600">
                      <MapPin size={12} className="inline mr-1 -mt-0.5" />
                      {bi.box.location}
                    </td>
                    <td><LineStatusBadge status={bi.box.lineStatus} /></td>
                    <td className="font-mono">{formatKW(bi.box.ratedCapacity)}</td>
                    <td className="font-mono">{formatKW(bi.usedCapacity)}</td>
                    <td className="font-mono">
                      <span
                        className={
                          bi.remainingCapacity <
                          bi.box.ratedCapacity * (1 - OVERLOAD_THRESHOLD)
                            ? "text-safe-danger font-semibold"
                            : "text-safe-success"
                        }
                      >
                        {formatKW(bi.remainingCapacity)}
                      </span>
                    </td>
                    <td>
                      <div className="w-24">
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${
                              bi.level === WarningLevel.DANGER
                                ? "bg-safe-danger"
                                : bi.level === WarningLevel.WARNING
                                ? "bg-safe-warning"
                                : "bg-safe-success"
                            }`}
                            style={{ width: `${Math.min(bi.usageRate * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs mt-0.5 text-right text-industrial-500 font-mono">
                          {(bi.usageRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </td>
                    <td>
                      <WarningLevelBadge level={bi.level} />
                    </td>
                    <td className="text-sm">
                      <span className="font-semibold text-industrial-800">
                        {connected}
                      </span>
                      <span className="text-industrial-400"> / </span>
                      <span>{boxStalls.length}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onSelect(bi)}
                        className="btn-primary text-xs"
                      >
                        <Eye size={14} /> 详情
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TimelineTab({ warnings }: { warnings: any[] }) {
  if (warnings.length === 0) {
    return (
      <div className="card p-12 text-center">
        <Info className="mx-auto text-safe-success/60 mb-3" size={48} />
        <p className="text-industrial-500">当前无任何预警或异常记录</p>
      </div>
    );
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-industrial-700 flex items-center gap-2">
          <Bell size={16} /> 全部预警与异常时间线
        </h3>
        <div className="flex items-center gap-3 text-xs text-industrial-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-safe-danger" />{" "}
            严重
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-safe-warning" />{" "}
            警告
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-safe-info" />{" "}
            提示
          </span>
        </div>
      </div>
      <WarningList warnings={warnings} />
    </div>
  );
}

function BoxDetailModal({
  info,
  stalls,
  applications,
  onClose,
}: {
  info: BoxCapacityInfo;
  stalls: Stall[];
  applications: any[];
  onClose: () => void;
}) {
  const usageRate = info.usageRate;
  const sortedStalls = [...stalls].sort((a, b) => {
    const ra = a.ratedCapacity > 0 ? a.occupiedCapacity / a.ratedCapacity : 0;
    const rb = b.ratedCapacity > 0 ? b.occupiedCapacity / b.ratedCapacity : 0;
    return rb - ra;
  });

  return (
    <Modal
      title={`配电箱详情 - ${info.box.code}`}
      size="xl"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1">
            <CapacityCard info={info} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-industrial-500 mb-1">位置</div>
                <div className="input bg-industrial-50 text-sm">
                  <MapPin size={14} className="inline mr-1 -mt-0.5" />
                  {info.box.location}
                </div>
              </div>
              <div>
                <div className="text-xs text-industrial-500 mb-1">线路状态</div>
                <div className="h-[38px] flex items-center">
                  <LineStatusBadge status={info.box.lineStatus} />
                </div>
              </div>
              <div>
                <div className="text-xs text-industrial-500 mb-1">描述</div>
                <div className="input bg-industrial-50 text-sm">
                  {info.box.description || "无备注"}
                </div>
              </div>
              <div>
                <div className="text-xs text-industrial-500 mb-1">预警等级</div>
                <div className="h-[38px] flex items-center">
                  <WarningLevelBadge level={info.level} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 border-industrial-100 bg-gradient-to-b from-industrial-50/50 to-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-industrial-600">
                  整体使用率
                </span>
                <span
                  className={`text-lg font-bold font-mono ${
                    usageRate > OVERLOAD_THRESHOLD
                      ? "text-safe-danger"
                      : usageRate > HIGH_LOAD_THRESHOLD
                      ? "text-safe-warning"
                      : "text-safe-success"
                  }`}
                >
                  {(usageRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-4 rounded-full bg-industrial-100 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usageRate > OVERLOAD_THRESHOLD
                      ? "bg-gradient-to-r from-orange-400 via-red-500 to-red-600"
                      : usageRate > HIGH_LOAD_THRESHOLD
                      ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500"
                      : "bg-gradient-to-r from-green-400 via-blue-400 to-indigo-500"
                  }`}
                  style={{ width: `${Math.min(usageRate * 100, 100)}%` }}
                />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-industrial-400">已使用</div>
                  <div className="font-semibold text-industrial-700 mt-0.5">
                    {formatKW(info.usedCapacity)}
                  </div>
                </div>
                <div className="text-center border-x border-industrial-100">
                  <div className="text-industrial-400">剩余</div>
                  <div
                    className={`font-semibold mt-0.5 ${
                      info.remainingCapacity <
                      info.box.ratedCapacity * (1 - OVERLOAD_THRESHOLD)
                        ? "text-safe-danger"
                        : "text-safe-success"
                    }`}
                  >
                    {formatKW(info.remainingCapacity)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-industrial-400">总额定</div>
                  <div className="font-semibold text-industrial-700 mt-0.5">
                    {formatKW(info.box.ratedCapacity)}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-industrial-500">
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-safe-warning" />
                接入摊位 {info.connectedStallCount} / {info.stallCount}
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown size={12} className="text-safe-info" />
                剩余可接入 {info.stallCount - info.connectedStallCount} 个
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        <div>
          <h4 className="text-sm font-semibold text-industrial-700 mb-3 flex items-center gap-2">
            <Grid3x3 size={15} /> 下属摊位详情（按负载率排序）
          </h4>
          {sortedStalls.length === 0 ? (
            <div className="text-center py-8 text-industrial-400">
              暂无下属摊位
            </div>
          ) : (
            <div className="data-table overflow-hidden rounded-lg">
              <table>
                <thead>
                  <tr>
                    <th>摊位</th>
                    <th>类型</th>
                    <th>状态</th>
                    <th>额定容量</th>
                    <th>已占用</th>
                    <th>负载率</th>
                    <th>锁定</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStalls.map((stall) => {
                    const rate =
                      stall.ratedCapacity > 0
                        ? stall.occupiedCapacity / stall.ratedCapacity
                        : 0;
                    const isOver = rate > OVERLOAD_THRESHOLD;
                    const isHigh = rate > HIGH_LOAD_THRESHOLD;
                    return (
                      <tr
                        key={stall.id}
                        className={
                          isOver
                            ? "bg-red-50/40"
                            : isHigh
                            ? "bg-yellow-50/30"
                            : ""
                        }
                      >
                        <td>
                          <div className="font-medium text-industrial-800">
                            {stall.code}
                          </div>
                          <div className="text-xs text-industrial-400">
                            {stall.name}
                          </div>
                        </td>
                        <td><StallTypeBadge type={stall.stallType} /></td>
                        <td><StallStatusBadge status={stall.status} /></td>
                        <td className="font-mono">{formatKW(stall.ratedCapacity)}</td>
                        <td className="font-mono">{formatKW(stall.occupiedCapacity)}</td>
                        <td>
                          <div className="w-28">
                            <div className="progress-bar">
                              <div
                                className={`progress-fill ${
                                  isOver
                                    ? "bg-safe-danger"
                                    : isHigh
                                    ? "bg-safe-warning"
                                    : "bg-safe-success"
                                }`}
                                style={{
                                  width: `${Math.min(rate * 100, 100)}%`,
                                }}
                              />
                            </div>
                            <div
                              className={`text-xs mt-0.5 text-right font-mono font-semibold ${
                                isOver
                                  ? "text-safe-danger"
                                  : isHigh
                                  ? "text-safe-warning"
                                  : "text-industrial-600"
                              }`}
                            >
                              {(rate * 100).toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          {stall.locked ? (
                            <span className="badge badge-info text-xs w-fit">
                              已锁定
                            </span>
                          ) : (
                            <span className="badge badge-secondary text-xs w-fit">
                              未锁定
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ============= 预警列表构建 =============
interface WarningItem {
  id: string;
  type: "danger" | "warning" | "info";
  icon: React.ReactNode;
  title: string;
  detail: string;
  time: string;
  tag?: string;
}

function buildWarnings(
  boxInfos: BoxCapacityInfo[],
  suspensions: any[],
  inspections: any[],
  stalls: Stall[]
): WarningItem[] {
  const list: WarningItem[] = [];
  const now = Date.now();

  // 1. 配电箱容量预警
  boxInfos.forEach((bi) => {
    if (bi.level === WarningLevel.DANGER) {
      list.push({
        id: `bw-d-${bi.box.id}`,
        type: "danger",
        icon: <Zap size={14} />,
        title: `${bi.box.code} 严重超载`,
        detail: `使用率 ${(bi.usageRate * 100).toFixed(1)}%（已用 ${formatKW(
          bi.usedCapacity
        )} / ${formatKW(bi.box.ratedCapacity)}），剩余 ${formatKW(
          bi.remainingCapacity
        )}，请立即处理！`,
        time: bi.box.updatedAt,
        tag: "容量超载",
      });
    } else if (bi.level === WarningLevel.WARNING) {
      list.push({
        id: `bw-w-${bi.box.id}`,
        type: "warning",
        icon: <Gauge size={14} />,
        title: `${bi.box.code} 高负载运行`,
        detail: `使用率 ${(bi.usageRate * 100).toFixed(1)}%（已用 ${formatKW(
          bi.usedCapacity
        )} / ${formatKW(bi.box.ratedCapacity)}），建议关注新增申请。`,
        time: bi.box.updatedAt,
        tag: "高负载",
      });
    }
  });

  // 2. 暂停供电摊位
  suspensions
    .filter((s) => s.status === SuspensionStatus.SUSPENDED)
    .forEach((s) => {
      const stall = stalls.find((st) => st.id === s.stallId);
      list.push({
        id: `susp-${s.id}`,
        type: "danger",
        icon: <AlertTriangle size={14} />,
        title: `${stall?.code || s.stallId.slice(0, 6)} 已暂停供电`,
        detail: `由 ${s.operatorName} 于 ${formatDateTime(
          s.suspendedAt
        )} 执行暂停，原因：${s.reason}`,
        time: s.suspendedAt,
        tag: "暂停供电",
      });
    });

  // 3. 异常巡检记录（最近10条）
  inspections
    .filter((i) => i.inspectionResult === "abnormal")
    .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))
    .slice(0, 10)
    .forEach((i) => {
      const stall = stalls.find((st) => st.id === i.stallId);
      const rated = stall?.ratedCapacity || 1;
      const reasons = [];
      if (i.isOverload) reasons.push(`超载${((i.measuredLoad / rated) * 100).toFixed(0)}%`);
      if (i.abnormalities?.length)
        reasons.push(`${i.abnormalities.length}项隐患`);
      list.push({
        id: `insp-${i.id}`,
        type: "warning",
        icon: <FileText size={14} />,
        title: `${stall?.code || "摊位"} 巡检异常`,
        detail: `巡检员 ${i.inspectorName}，实测 ${i.measuredLoad.toFixed(
          2
        )}kW${reasons.length ? " - " + reasons.join("、") : ""}${
          i.remarks ? `（${i.remarks}）` : ""
        }`,
        time: i.inspectedAt,
        tag: "巡检异常",
      });
    });

  // 4. 摊位个体超载
  stalls.forEach((s) => {
    if (s.status !== StallStatus.CONNECTED) return;
    if (s.ratedCapacity <= 0) return;
    const rate = s.occupiedCapacity / s.ratedCapacity;
    if (rate > OVERLOAD_THRESHOLD) {
      list.push({
        id: `stall-over-${s.id}`,
        type: "warning",
        icon: <TrendingUp size={14} />,
        title: `${s.code} 摊位负载过高`,
        detail: `接入功率 ${formatKW(
          s.occupiedCapacity
        )}，超过额定 ${formatKW(s.ratedCapacity)} 的 ${(
          OVERLOAD_THRESHOLD * 100
        ).toFixed(0)}%（实际 ${(rate * 100).toFixed(1)}%）`,
        time: s.updatedAt,
        tag: "摊位超载",
      });
    }
  });

  // 5. 线路异常配电箱
  boxInfos
    .filter((bi) => bi.box.lineStatus !== "normal")
    .forEach((bi) => {
      list.push({
        id: `line-${bi.box.id}`,
        type: "danger",
        icon: <AlertTriangle size={14} />,
        title: `${bi.box.code} 线路状态异常`,
        detail: `当前线路状态为「${
          bi.box.lineStatus === "abnormal" ? "线路异常" : "维护中"
        }」，下属 ${bi.stallCount} 个摊位受影响`,
        time: bi.box.updatedAt,
        tag: "线路异常",
      });
    });

  // 按时间倒序
  return list.sort((a, b) => {
    const rank = { danger: 0, warning: 1, info: 2 };
    const tr = rank[a.type] - rank[b.type];
    if (tr !== 0) return tr;
    return String(b.time || "").localeCompare(String(a.time || ""));
  });
}
