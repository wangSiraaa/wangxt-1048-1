import React, { useMemo } from "react";
import { useBoxStore } from "@/store/useBoxStore";
import { useStallStore } from "@/store/useStallStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useInspectionStore } from "@/store/useInspectionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { UserRole } from "@/types/enums";
import CapacityCard, { buildBoxInfo } from "@/components/capacity/CapacityCard";
import StallGrid from "@/components/stall/StallGrid";
import WarningList from "@/components/capacity/WarningList";
import { ApplicationStatusBadge, InspectionResultBadge } from "@/components/common/StatusBadge";
import {
  Zap,
  Users,
  FileCheck,
  PlugZap,
  Shield,
  Gauge,
  TrendingUp,
  Activity,
  AlertTriangle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatKW, formatPct } from "@/utils/capacity";
import { formatDateTime } from "@/utils/time";

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  to,
  accent,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  to?: string;
  accent?: string;
}) {
  const content = (
    <div
      className={`card p-4 flex items-center gap-4 transition-all hover:shadow-panel ${
        to ? "cursor-pointer" : ""
      } ${accent ? `border-l-4 ${accent}` : ""}`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-industrial-500 font-medium">{label}</p>
        <p className="text-2xl font-bold font-mono text-industrial-800 leading-tight mt-1">
          {value}
        </p>
        {sub && <p className="text-[11px] text-industrial-400 mt-0.5">{sub}</p>}
      </div>
      {to && (
        <ChevronRight size={16} className="text-industrial-400 shrink-0" />
      )}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { boxes = [] } = useBoxStore();
  const { stalls = [] } = useStallStore();
  const { applications = [] } = useApplicationStore();
  const { connections = [] } = useConnectionStore();
  const { inspections = [], suspensions = [] } = useInspectionStore();
  const { currentRole = UserRole.OPERATION } = useAuthStore();

  const stats = useMemo(() => {
    const totalRated = boxes.reduce((s, b) => s + b.ratedCapacity, 0);
    const totalUsed = stalls.reduce((s, st) => s + (st.occupiedCapacity || 0), 0);
    const connected = stalls.filter((s) => s.status === "connected").length;
    const applying = stalls.filter((s) => s.status === "applying").length;
    const suspended = stalls.filter((s) => s.status === "suspended").length;
    const pending = applications.filter((a) => a.status === "pending").length;
    return {
      totalBoxes: boxes.length,
      totalStalls: stalls.length,
      totalRated,
      totalUsed,
      totalRate: totalRated ? totalUsed / totalRated : 0,
      connected,
      applying,
      suspended,
      pending,
      todayConnections: connections.length,
      todayInspections: inspections.length,
      activeSuspensions: suspensions.filter((s) => s.status === "suspended").length,
    };
  }, [boxes, stalls, applications, connections, inspections, suspensions]);

  const recentApprovals = useMemo(
    () =>
      [...applications]
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 4),
    [applications]
  );

  const recentInspections = useMemo(
    () =>
      [...inspections]
        .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))
        .slice(0, 4),
    [inspections]
  );

  const roleTip: Record<UserRole, string> = {
    [UserRole.OPERATION]:
      "您可以维护摊位、配电箱信息，审批用电申请，并随时监控整体容量状态。",
    [UserRole.MERCHANT]:
      "请在【商户用电申请】中选择空闲摊位并填写设备清单，提交后等待审批。",
    [UserRole.ELECTRICIAN]:
      "您可以在【电工接电台】查看待接电任务，核对剩余容量后完成接电操作。",
    [UserRole.INSPECTOR]:
      "请定期巡检摊位，发现超载或异常情况可立即暂停供电。",
  };

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-r from-industrial-700 via-industrial-800 to-industrial-700 text-white p-6 overflow-hidden relative">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute right-20 bottom-0 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative flex items-start justify-between gap-6 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3">
              <Activity size={12} className="animate-pulse-soft" />
              配电系统运行中 · 本地数据已保存
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">
              欢迎使用露天市集配电管理
            </h2>
            <p className="text-sm text-industrial-200 leading-relaxed max-w-2xl">
              {roleTip[currentRole]}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 text-right shrink-0">
            <p className="text-xs text-industrial-300">全市场容量使用</p>
            <p className="text-4xl font-bold font-mono bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
              {formatPct(stats.totalRate)}
            </p>
            <p className="text-xs text-industrial-300 font-mono">
              {formatKW(stats.totalUsed)} / {formatKW(stats.totalRated)} kW
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Gauge size={22} />}
          iconBg="bg-blue-50"
          iconColor="text-safe-info"
          label="配电箱"
          value={stats.totalBoxes}
          sub={`总容量 ${formatKW(stats.totalRated)}kW`}
          to="/capacity"
          accent="border-l-safe-info"
        />
        <StatCard
          icon={<Zap size={22} />}
          iconBg="bg-emerald-50"
          iconColor="text-safe-normal"
          label="摊位总数"
          value={stats.totalStalls}
          sub={`接入 ${stats.connected} · 申请中 ${stats.applying}`}
          to="/operation"
          accent="border-l-safe-normal"
        />
        <StatCard
          icon={<FileCheck size={22} />}
          iconBg="bg-amber-50"
          iconColor="text-safe-warning"
          label="待审批申请"
          value={stats.pending}
          sub="点击前往审批"
          to="/operation"
          accent="border-l-safe-warning"
        />
        <StatCard
          icon={<PlugZap size={22} />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="已接电"
          value={stats.todayConnections}
          sub="累计接电记录"
          to="/electrician"
          accent="border-l-indigo-500"
        />
        <StatCard
          icon={<Shield size={22} />}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="巡检次数"
          value={stats.todayInspections}
          sub="累计巡检记录"
          to="/inspection"
          accent="border-l-cyan-500"
        />
        <StatCard
          icon={<AlertTriangle size={22} />}
          iconBg="bg-red-50"
          iconColor="text-safe-danger"
          label="暂停供电"
          value={stats.activeSuspensions}
          sub="当前已暂停摊位"
          to="/inspection"
          accent="border-l-safe-danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-industrial-800 flex items-center gap-2">
                  <ServerIcon size={18} />
                  配电箱容量分布
                </h3>
                <p className="text-xs text-industrial-500 mt-0.5">
                  每个配电箱的实时负载状态
                </p>
              </div>
              <Link
                to="/capacity"
                className="text-xs font-medium text-industrial-600 hover:text-industrial-800 flex items-center gap-0.5"
              >
                容量监控中心 <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {boxes.map((b) => (
                <CapacityCard key={b.id} info={buildBoxInfo(b, stalls)} />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-industrial-800 flex items-center gap-2">
                  <TrendingUp size={18} />
                  摊位全景图
                </h3>
                <p className="text-xs text-industrial-500 mt-0.5">
                  按配电箱分组显示所有摊位状态
                </p>
              </div>
            </div>
            <StallGrid boxes={boxes} stalls={stalls} />
          </div>
        </div>

        <div className="space-y-6">
          <WarningList boxes={boxes} stalls={stalls} />

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-industrial-800 flex items-center gap-2">
                  <FileCheck size={16} />
                  最近申请
                </h3>
              </div>
              <Link
                to="/operation"
                className="text-xs font-medium text-industrial-600 hover:text-industrial-800 flex items-center gap-0.5"
              >
                全部 <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-industrial-50 -mx-4">
              {recentApprovals.length === 0 ? (
                <div className="py-8 text-center text-industrial-400 text-sm">
                  暂无申请记录
                </div>
              ) : (
                recentApprovals.map((app) => {
                  const stall = stalls.find((s) => s.id === app.stallId);
                  return (
                    <div
                      key={app.id}
                      className="px-4 py-3 hover:bg-industrial-50/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-industrial-800">
                          {stall?.code || "-"} · {app.merchantName}
                        </span>
                        <ApplicationStatusBadge status={app.status} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-industrial-500">
                        <span className="font-mono">
                          {formatKW(app.peakPower)} kW · {app.devices.length} 台设备
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatDateTime(app.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="font-semibold text-industrial-800 flex items-center gap-2">
                  <Shield size={16} />
                  最近巡检
                </h3>
              </div>
              <Link
                to="/inspection"
                className="text-xs font-medium text-industrial-600 hover:text-industrial-800 flex items-center gap-0.5"
              >
                全部 <ChevronRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-industrial-50 -mx-4">
              {recentInspections.length === 0 ? (
                <div className="py-8 text-center text-industrial-400 text-sm">
                  暂无巡检记录
                </div>
              ) : (
                recentInspections.map((ins) => {
                  const stall = stalls.find((s) => s.id === ins.stallId);
                  return (
                    <div
                      key={ins.id}
                      className="px-4 py-3 hover:bg-industrial-50/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-industrial-800">
                          {stall?.code || "-"} · {ins.inspectorName}
                        </span>
                        <InspectionResultBadge result={ins.result ?? ins.inspectionResult} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-industrial-500">
                        <span className="truncate mr-2">
                          {ins.notes || ins.remarks || "无备注"}
                        </span>
                        <span className="flex items-center gap-1 shrink-0">
                          <Clock size={10} />
                          {formatDateTime(ins.inspectedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServerIcon({ size }: { size: number }) {
  return <Gauge size={size} />;
}
