import React, { useMemo, useState } from "react";
import {
  Lock,
  ShieldAlert,
  Search,
  PauseCircle,
  PlayCircle,
  FileText,
  Eye,
  User,
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Gauge,
  Camera,
  ListChecks,
  Clock,
  Activity,
} from "lucide-react";
import { useStallStore } from "@/store/useStallStore";
import { useBoxStore } from "@/store/useBoxStore";
import { useInspectionStore } from "@/store/useInspectionStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/common/Toast";
import Modal from "@/components/common/Modal";
import {
  InspectionResultBadge,
  LineStatusBadge,
  StallStatusBadge,
  StallTypeBadge,
  SuspensionStatusBadge,
  ApplicationTypeBadge,
} from "@/components/common/StatusBadge";
import CapacityCard, { buildBoxInfo } from "@/components/capacity/CapacityCard";
import StallGrid from "@/components/stall/StallGrid";
import {
  UserRole,
  StallStatus,
  InspectionResult,
  SuspensionStatus,
  WarningLevel,
  ApplicationType,
  HIGH_LOAD_THRESHOLD,
} from "@/types/enums";
import { InspectionRecord, SuspensionRecord, Stall } from "@/types";
import { validateSuspend, validateRestore } from "@/utils/validation";
import { formatKW, calcBoxRemainingCapacity } from "@/utils/capacity";
import { formatDateTime } from "@/utils/time";

type TabKey = "inspect" | "abnormal" | "history";

const ABNORMALITY_OPTIONS = [
  { value: "overload", label: "用电超载" },
  { value: "loose_wire", label: "接线松动" },
  { value: "damaged_cable", label: "线缆破损" },
  { value: "grounding", label: "接地不良" },
  { value: "leakage", label: "漏电保护失效" },
  { value: "water_risk", label: "有淋水风险" },
  { value: "temp_high", label: "温度过高" },
  { value: "other", label: "其他隐患" },
];

export default function InspectionStation() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  if (currentRole !== UserRole.INSPECTOR) {
    return (
      <div className="card p-12 text-center">
        <Lock className="mx-auto text-industrial-300 mb-3" size={48} />
        <h3 className="text-lg font-semibold text-industrial-800 mb-2">
          无权限访问
        </h3>
        <p className="text-sm text-industrial-500">
          该工作台仅【安全巡检员】可访问，请切换角色。
        </p>
      </div>
    );
  }
  return <InspectionInner />;
}

function InspectionInner() {
  const toast = useToast();
  const { stalls = [] } = useStallStore();
  const { boxes = [] } = useBoxStore();
  const { inspections = [], suspensions = [], addInspection, suspendStall, limitStall, restoreStall } =
    useInspectionStore();
  const { applications = [] } = useApplicationStore();
  const { currentUserName = "系统用户" } = useAuthStore();

  const [tab, setTab] = useState<TabKey>("inspect");
  const [selectedStall, setSelectedStall] = useState<Stall | null>(null);
  const [viewInsp, setViewInsp] = useState<InspectionRecord | null>(null);
  const [viewSusp, setViewSusp] = useState<SuspensionRecord | null>(null);
  const [suspendStallId, setSuspendStallId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [restoreStallId, setRestoreStallId] = useState<string | null>(null);
  const [restoreRemark, setRestoreRemark] = useState("");
  const [limitStallId, setLimitStallId] = useState<string | null>(null);
  const [limitReason, setLimitReason] = useState("");

  const [measuredLoad, setMeasuredLoad] = useState(0);
  const [selectedAbnormalities, setSelectedAbnormalities] = useState<string[]>([]);
  const [inspectionRemarks, setInspectionRemarks] = useState("");

  const connectedStalls = useMemo(
    () => stalls.filter((s) => s.status === StallStatus.CONNECTED),
    [stalls]
  );

  const suspendedStalls = useMemo(
    () => stalls.filter((s) => s.status === StallStatus.SUSPENDED),
    [stalls]
  );

  const limitedStalls = useMemo(
    () => stalls.filter((s) => s.status === StallStatus.LIMITED),
    [stalls]
  );

  const overloadedBoxes = useMemo(() => {
    return boxes
      .map((b) => buildBoxInfo(b, stalls))
      .filter((bi) => bi.level === WarningLevel.DANGER || bi.level === WarningLevel.WARNING);
  }, [boxes, stalls]);

  const historyInspections = useMemo(
    () => [...inspections].sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || ""))),
    [inspections]
  );

  const activeSuspensions = useMemo(
    () => suspensions.filter((s) => s.status === SuspensionStatus.SUSPENDED),
    [suspensions]
  );

  function resetInspectionForm() {
    setMeasuredLoad(0);
    setSelectedAbnormalities([]);
    setInspectionRemarks("");
  }

  function handleSubmitInspection() {
    if (!selectedStall) return;
    if (measuredLoad <= 0) {
      toast.error("请填写有效的实测负载");
      return;
    }
    const rated = selectedStall.ratedCapacity;
    const isOverload = measuredLoad > rated * HIGH_LOAD_THRESHOLD;
    const isAbnormal = isOverload || selectedAbnormalities.length > 0;

    const inspId = addInspection({
      stallId: selectedStall.id,
      measuredLoad,
      isOverload,
      abnormalities: selectedAbnormalities,
      inspectionResult: isAbnormal ? InspectionResult.ABNORMAL : InspectionResult.NORMAL,
      remarks: inspectionRemarks.trim() || undefined,
    });

    if (isAbnormal) {
      toast.warning(
        `检测到异常: ${
          isOverload
            ? `超载 ${((measuredLoad / rated) * 100).toFixed(0)}%`
            : `${selectedAbnormalities.length}项隐患`
        }, 建议暂停供电`
      );
      setSelectedStall(null);
      resetInspectionForm();
    } else {
      toast.success("巡检完成，一切正常");
      setSelectedStall(null);
      resetInspectionForm();
    }
  }

  function handleConfirmSuspend() {
    if (!suspendStallId) return;
    const stall = stalls.find((s) => s.id === suspendStallId);
    const check = validateSuspend(stall!);
    if (!check.valid) {
      toast.error(check.message!);
      return;
    }
    if (!suspendReason.trim()) {
      toast.error("请填写暂停原因");
      return;
    }
    const lastInsp = [...inspections]
      .filter((i) => i.stallId === suspendStallId)
      .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))[0];
    const id = suspendStall(
      suspendStallId,
      suspendReason.trim(),
      lastInsp?.id
    );
    if (id) {
      toast.success("已暂停该摊位供电");
      setSuspendStallId(null);
      setSuspendReason("");
    } else {
      toast.error("暂停失败，状态不满足条件");
    }
  }

  function handleConfirmRestore() {
    if (!restoreStallId) return;
    const stall = stalls.find((s) => s.id === restoreStallId);
    const check = validateRestore(stall!);
    if (!check.valid) {
      toast.error(check.message!);
      return;
    }
    const ok = restoreStall(restoreStallId, restoreRemark.trim() || undefined);
    if (ok) {
      toast.success("已恢复该摊位供电");
      setRestoreStallId(null);
      setRestoreRemark("");
    } else {
      toast.error("恢复失败");
    }
  }

  function handleConfirmLimit() {
    if (!limitStallId) return;
    const stall = stalls.find((s) => s.id === limitStallId);
    if (!stall || stall.status !== StallStatus.CONNECTED) {
      toast.error("该摊位状态不满足限电条件");
      return;
    }
    if (!limitReason.trim()) {
      toast.error("请填写限电原因");
      return;
    }
    const lastInsp = [...inspections]
      .filter((i) => i.stallId === limitStallId)
      .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))[0];
    const id = limitStall(
      limitStallId,
      limitReason.trim(),
      lastInsp?.id
    );
    if (id) {
      toast.success("已对该摊位执行限电待整改");
      setLimitStallId(null);
      setLimitReason("");
    } else {
      toast.error("限电失败，状态不满足条件");
    }
  }

  function getStallBox(stallId: string) {
    const s = stalls.find((x) => x.id === stallId);
    return s ? boxes.find((b) => b.id === s.distributionBoxId) : undefined;
  }

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 text-safe-danger flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-industrial-800">安全巡检台</h2>
            <p className="text-xs text-industrial-500 mt-0.5">
              巡检用电安全，发现隐患后可暂停供电，整改完毕恢复
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <div className="stat-card bg-gradient-to-br from-green-50 to-white border-l-4 border-safe-success">
            <div className="text-2xl font-bold text-industrial-800">
              {connectedStalls.length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">需巡检摊位</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-red-50 to-white border-l-4 border-safe-danger">
            <div className="text-2xl font-bold text-industrial-800">
              {suspendedStalls.length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">已暂停摊位</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-400">
            <div className="text-2xl font-bold text-industrial-800">
              {limitedStalls.length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">限电待整改</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-orange-50 to-white border-l-4 border-orange-400">
            <div className="text-2xl font-bold text-industrial-800">
              {overloadedBoxes.filter((b) => b.level === WarningLevel.DANGER).length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">超载配电箱</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-400">
            <div className="text-2xl font-bold text-industrial-800">
              {activeSuspensions.length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">未恢复暂停</div>
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            onClick={() => setTab("inspect")}
            className={tab === "inspect" ? "tab-active" : "tab-inactive"}
          >
            <Search size={14} /> 巡检作业 ({connectedStalls.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("abnormal")}
            className={tab === "abnormal" ? "tab-active" : "tab-inactive"}
          >
            <AlertTriangle size={14} /> 异常与暂停 ({activeSuspensions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={tab === "history" ? "tab-active" : "tab-inactive"}
          >
            <FileText size={14} /> 巡检记录 ({inspections.length})
          </button>
        </div>
      </div>

      {overloadedBoxes.length > 0 && tab === "inspect" && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-3 flex items-center gap-2">
            <Gauge size={16} className="text-safe-danger" />
            容量预警 - 请优先巡检以下配电箱下的摊位
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overloadedBoxes.map((bi) => (
              <CapacityCard key={bi.box.id} info={bi} compact />
            ))}
          </div>
        </div>
      )}

      {tab === "inspect" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card p-5">
            <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
              <MapPin size={16} />
              摊位分布 - 点击摊位开始巡检
            </h3>
            <StallGrid
              onSelect={(stall) => {
                if (stall.status === StallStatus.CONNECTED) {
                  setSelectedStall(stall);
                  resetInspectionForm();
                } else {
                  toast.warning("仅已接电摊位可执行安全巡检");
                }
              }}
            />
            <div className="mt-3 text-xs text-industrial-400 flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-green-500" /> 已接电可巡检
              <span className="inline-block w-3 h-3 rounded bg-orange-500 ml-2" /> 暂停中
              <span className="inline-block w-3 h-3 rounded bg-industrial-300 ml-2" /> 空闲/申请中
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
              <ListChecks size={16} />
              待巡检摊位列表
            </h3>
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {connectedStalls.length === 0 ? (
                <div className="text-center py-8 text-industrial-400">
                  <CheckCircle size={32} className="mx-auto mb-2" />
                  <p>暂无待巡检摊位</p>
                </div>
              ) : (
                connectedStalls.map((stall) => {
                  const box = getStallBox(stall.id);
                  const lastInsp = [...inspections]
                    .filter((i) => i.stallId === stall.id)
                    .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))[0];
                  const loadRate =
                    stall.ratedCapacity > 0
                      ? stall.occupiedCapacity / stall.ratedCapacity
                      : 0;
                  const boostApp = applications.find(
                    (a) => a.stallId === stall.id && a.status === "connected" && a.applicationType === ApplicationType.TEMPORARY_BOOST
                  );
                  return (
                    <button
                      key={stall.id}
                      type="button"
                      onClick={() => {
                        setSelectedStall(stall);
                        resetInspectionForm();
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedStall?.id === stall.id
                          ? "border-safe-info bg-blue-50"
                          : "border-industrial-100 hover:border-industrial-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-industrial-800 text-sm flex items-center gap-2">
                            {stall.code} {stall.name}
                            <StallStatusBadge status={stall.status} />
                          </div>
                          <div className="text-xs text-industrial-500 mt-0.5 flex items-center gap-2">
                            <span>{box?.code}</span>
                            <StallTypeBadge type={stall.stallType} />
                            {boostApp && <ApplicationTypeBadge type={ApplicationType.TEMPORARY_BOOST} />}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xs font-semibold ${
                              loadRate > 0.9
                                ? "text-safe-danger"
                                : loadRate > 0.75
                                ? "text-safe-warning"
                                : "text-safe-success"
                            }`}
                          >
                            {formatKW(stall.occupiedCapacity)}/
                            {formatKW(stall.ratedCapacity)}
                          </div>
                          {boostApp && boostApp.approvedBoostPower != null && (
                            <div className="text-xs text-amber-600 mt-0.5">
                              扩容: {formatKW(boostApp.approvedBoostPower)}
                            </div>
                          )}
                          {lastInsp && (
                            <div className="text-xs text-industrial-400 mt-0.5 flex items-center gap-1 justify-end">
                              <Clock size={10} />
                              {formatDateTime(lastInsp.inspectedAt).slice(5, 16)}
                            </div>
                          )}
                        </div>
                      </div>
                      {stall.status === StallStatus.LIMITED && (
                        <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                          <AlertTriangle size={12} className="shrink-0" />
                          该摊位因超载已被限电，需整改后恢复
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "abnormal" && (
        <AbnormalTab
          stalls={stalls}
          applications={applications}
          inspections={inspections}
          activeSuspensions={activeSuspensions}
          allSuspensions={suspensions}
          onSuspend={(id) => setSuspendStallId(id)}
          onLimit={(id) => setLimitStallId(id)}
          onRestore={(id) => setRestoreStallId(id)}
          onViewSusp={(s) => setViewSusp(s)}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          inspections={historyInspections}
          stalls={stalls}
          onView={(i) => setViewInsp(i)}
        />
      )}

      {selectedStall && (
        <InspectionFormModal
          stall={selectedStall}
          box={getStallBox(selectedStall.id)!}
          applications={applications}
          measuredLoad={measuredLoad}
          setMeasuredLoad={setMeasuredLoad}
          abnormalities={selectedAbnormalities}
          setAbnormalities={setSelectedAbnormalities}
          remarks={inspectionRemarks}
          setRemarks={setInspectionRemarks}
          onCancel={() => {
            setSelectedStall(null);
            resetInspectionForm();
          }}
          onSubmit={handleSubmitInspection}
          onSuspend={() => {
            setSuspendStallId(selectedStall.id);
            setSelectedStall(null);
          }}
          onLimit={() => {
            setLimitStallId(selectedStall.id);
            setSelectedStall(null);
          }}
        />
      )}

      {suspendStallId && (
        <SuspendModal
          stall={stalls.find((s) => s.id === suspendStallId)!}
          reason={suspendReason}
          setReason={setSuspendReason}
          onCancel={() => {
            setSuspendStallId(null);
            setSuspendReason("");
          }}
          onConfirm={handleConfirmSuspend}
        />
      )}

      {restoreStallId && (
        <RestoreModal
          stall={stalls.find((s) => s.id === restoreStallId)!}
          remark={restoreRemark}
          setRemark={setRestoreRemark}
          onCancel={() => {
            setRestoreStallId(null);
            setRestoreRemark("");
          }}
          onConfirm={handleConfirmRestore}
        />
      )}

      {limitStallId && (
        <LimitModal
          stall={stalls.find((s) => s.id === limitStallId)!}
          reason={limitReason}
          setReason={setLimitReason}
          onCancel={() => {
            setLimitStallId(null);
            setLimitReason("");
          }}
          onConfirm={handleConfirmLimit}
        />
      )}

      {viewInsp && (
        <InspectionDetailModal
          record={viewInsp}
          stall={stalls.find((s) => s.id === viewInsp.stallId)}
          onClose={() => setViewInsp(null)}
        />
      )}

      {viewSusp && (
        <SuspensionDetailModal
          record={viewSusp}
          stall={stalls.find((s) => s.id === viewSusp.stallId)}
          inspection={
            viewSusp.inspectionRecordId
              ? inspections.find((i) => i.id === viewSusp.inspectionRecordId)
              : undefined
          }
          onClose={() => setViewSusp(null)}
        />
      )}
    </div>
  );
}

function AbnormalTab({
  stalls,
  applications,
  inspections,
  activeSuspensions,
  allSuspensions,
  onSuspend,
  onLimit,
  onRestore,
  onViewSusp,
}: {
  stalls: Stall[];
  applications: any[];
  inspections: InspectionRecord[];
  activeSuspensions: SuspensionRecord[];
  allSuspensions: SuspensionRecord[];
  onSuspend: (id: string) => void;
  onLimit: (id: string) => void;
  onRestore: (id: string) => void;
  onViewSusp: (s: SuspensionRecord) => void;
}) {
  const abnormalInsp = useMemo(
    () =>
      inspections
        .filter((i) => i.inspectionResult === InspectionResult.ABNORMAL)
        .sort((a, b) => String(b.inspectedAt || "").localeCompare(String(a.inspectedAt || "")))
        .slice(0, 50),
    [inspections]
  );

  const connectedStalls = stalls.filter((s) => s.status === StallStatus.CONNECTED);
  const stallMap = new Map(stalls.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-industrial-700 flex items-center gap-2">
            <PauseCircle size={16} className="text-safe-warning" />
            当前暂停供电摊位 ({activeSuspensions.length})
          </h3>
        </div>
        {activeSuspensions.length === 0 ? (
          <div className="text-center py-10 text-industrial-400">
            <CheckCircle size={40} className="mx-auto mb-2" />
            <p>当前无暂停供电的摊位</p>
          </div>
        ) : (
          <div className="data-table overflow-hidden rounded-lg">
            <table>
              <thead>
                <tr>
                  <th>摊位</th>
                  <th>商户</th>
                  <th>暂停原因</th>
                  <th>操作人</th>
                  <th>暂停时间</th>
                  <th>关联巡检</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {activeSuspensions.map((s) => {
                  const stall = stallMap.get(s.stallId);
                  const app = applications.find(
                    (a) => a.stallId === s.stallId && a.status === "connected"
                  );
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="font-medium">{stall?.code}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {stall && <StallTypeBadge type={stall.stallType} />}
                          {stall && <StallStatusBadge status={stall.status} />}
                        </div>
                      </td>
                      <td>{app?.merchantName || "-"}</td>
                      <td>
                        <span className="text-sm text-industrial-700">{s.reason}</span>
                      </td>
                      <td>{s.operatorName}</td>
                      <td className="text-xs text-industrial-500">
                        {formatDateTime(s.suspendedAt)}
                      </td>
                      <td>
                        {s.inspectionRecordId ? (
                          <span className="badge badge-warning w-fit">
                            有异常记录
                          </span>
                        ) : (
                          <span className="badge badge-secondary w-fit">直接处理</span>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onViewSusp(s)}
                            className="btn-ghost text-xs"
                          >
                            <Eye size={14} /> 详情
                          </button>
                          <button
                            type="button"
                            onClick={() => onRestore(s.stallId)}
                            className="btn-success text-xs"
                          >
                            <PlayCircle size={14} /> 恢复供电
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-safe-danger" />
            建议立即处理（高负载摊位）
          </h3>
          {connectedStalls.filter((s) => {
            const rate = s.ratedCapacity > 0 ? s.occupiedCapacity / s.ratedCapacity : 0;
            return rate > HIGH_LOAD_THRESHOLD;
          }).length === 0 && stalls.filter((s) => s.status === StallStatus.LIMITED).length === 0 ? (
            <div className="text-center py-6 text-industrial-400 text-sm">
              所有摊位负载正常
            </div>
          ) : (
            <div className="space-y-2">
              {connectedStalls
                .filter((s) => {
                  const rate =
                    s.ratedCapacity > 0 ? s.occupiedCapacity / s.ratedCapacity : 0;
                  return rate > HIGH_LOAD_THRESHOLD;
                })
                .sort((a, b) => {
                  const ra = a.occupiedCapacity / a.ratedCapacity;
                  const rb = b.occupiedCapacity / b.ratedCapacity;
                  return rb - ra;
                })
                .map((stall) => {
                  const rate = stall.occupiedCapacity / stall.ratedCapacity;
                  const app = applications.find(
                    (a) => a.stallId === stall.id && a.status === "connected"
                  );
                  const boostApp = applications.find(
                    (a) => a.stallId === stall.id && a.status === "connected" && a.applicationType === ApplicationType.TEMPORARY_BOOST
                  );
                  const approvedPower = boostApp?.approvedBoostPower ?? boostApp?.peakPower;
                  const isBoostOverloaded = boostApp && approvedPower != null && stall.occupiedCapacity > approvedPower;
                  return (
                    <div
                      key={stall.id}
                      className="p-3 rounded-lg border border-red-100 bg-red-50/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-industrial-800 flex items-center gap-2">
                            {stall.code} {stall.name}
                            <StallStatusBadge status={stall.status} />
                          </div>
                          <div className="text-xs text-industrial-500">
                            {app?.merchantName || "-"}
                            {boostApp && (
                              <span className="ml-2">
                                <ApplicationTypeBadge type={ApplicationType.TEMPORARY_BOOST} />
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isBoostOverloaded && (
                            <button
                              type="button"
                              onClick={() => onLimit(stall.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 transition-colors"
                            >
                              <AlertTriangle size={14} /> 限电待整改
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSuspend(stall.id)}
                            className="btn-danger text-xs"
                          >
                            <PauseCircle size={14} /> 立即暂停
                          </button>
                        </div>
                      </div>
                      {boostApp && approvedPower != null && (
                        <div className="mb-2 p-2 rounded bg-amber-50 border border-amber-200">
                          <div className="text-xs text-industrial-600 flex items-center justify-between">
                            <span>审批扩容功率: <b>{formatKW(approvedPower)}</b></span>
                            <span>实际占用: <b>{formatKW(stall.occupiedCapacity)}</b></span>
                          </div>
                          {isBoostOverloaded && (
                            <div className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                              <AlertTriangle size={12} className="shrink-0" />
                              实测负载 {formatKW(stall.occupiedCapacity)} &gt; 审批功率 {formatKW(approvedPower)}，建议限电
                            </div>
                          )}
                        </div>
                      )}
                      <div className="progress-bar">
                        <div
                          className="progress-fill bg-safe-danger"
                          style={{ width: `${Math.min(rate * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1 text-xs">
                        <span className="text-industrial-500">
                          {formatKW(stall.occupiedCapacity)}/
                          {formatKW(stall.ratedCapacity)}
                        </span>
                        <span className="text-safe-danger font-semibold">
                          {(rate * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              {stalls
                .filter((s) => s.status === StallStatus.LIMITED)
                .map((stall) => {
                  const app = applications.find(
                    (a) => a.stallId === stall.id && a.status === "connected"
                  );
                  const boostApp = applications.find(
                    (a) => a.stallId === stall.id && a.applicationType === ApplicationType.TEMPORARY_BOOST
                  );
                  return (
                    <div
                      key={stall.id}
                      className="p-3 rounded-lg border border-amber-200 bg-amber-50/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-semibold text-industrial-800 flex items-center gap-2">
                            {stall.code} {stall.name}
                            <StallStatusBadge status={stall.status} />
                          </div>
                          <div className="text-xs text-industrial-500">
                            {app?.merchantName || "-"}
                            {boostApp && (
                              <span className="ml-2">
                                <ApplicationTypeBadge type={ApplicationType.TEMPORARY_BOOST} />
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRestore(stall.id)}
                          className="btn-success text-xs"
                        >
                          <PlayCircle size={14} /> 恢复供电
                        </button>
                      </div>
                      <div className="p-2 rounded bg-amber-100/50 border border-amber-200 text-xs text-amber-700 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="shrink-0" />
                        该摊位因超载已被限电，需整改后恢复
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-industrial-700 mb-4 flex items-center gap-2">
            <FileText size={16} />
            最近异常巡检记录
          </h3>
          {abnormalInsp.length === 0 ? (
            <div className="text-center py-6 text-industrial-400 text-sm">
              暂无异常记录
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {abnormalInsp.map((i) => {
                const stall = stallMap.get(i.stallId);
                const isSuspended = activeSuspensions.some(
                  (s) => s.stallId === i.stallId
                );
                const canSuspend = stall?.status === StallStatus.CONNECTED;
                const canLimit = canSuspend && (() => {
                  const boostApp = applications.find(
                    (a) => a.stallId === i.stallId && a.status === "connected" && a.applicationType === ApplicationType.TEMPORARY_BOOST
                  );
                  const approvedPower = boostApp?.approvedBoostPower ?? boostApp?.peakPower;
                  return boostApp && approvedPower != null && i.measuredLoad > approvedPower;
                })();
                return (
                  <div
                    key={i.id}
                    className="p-3 rounded-lg border border-industrial-100 bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-industrial-800 text-sm">
                          {stall?.code}
                        </span>
                        <InspectionResultBadge result={i.inspectionResult} />
                        {isSuspended && (
                          <SuspensionStatusBadge status={SuspensionStatus.SUSPENDED} />
                        )}
                        {stall?.status === StallStatus.LIMITED && (
                          <StallStatusBadge status={StallStatus.LIMITED} />
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canLimit && !isSuspended && (
                          <button
                            type="button"
                            onClick={() => onLimit(i.stallId)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 transition-colors"
                          >
                            <AlertTriangle size={12} /> 限电
                          </button>
                        )}
                        {canSuspend && !isSuspended && stall?.status !== StallStatus.LIMITED && (
                          <button
                            type="button"
                            onClick={() => onSuspend(i.stallId)}
                            className="btn-danger text-xs"
                          >
                            <PauseCircle size={12} /> 暂停
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-industrial-500 mb-1 flex items-center gap-2">
                      <User size={12} /> {i.inspectorName}
                      <span className="mx-1">·</span>
                      <Clock size={12} /> {formatDateTime(i.inspectedAt).slice(5, 16)}
                    </div>
                    <div className="text-xs text-industrial-600">
                      实测 <b>{i.measuredLoad.toFixed(2)}kW</b>
                      {i.isOverload && (
                        <span className="text-safe-danger ml-1">（超载）</span>
                      )}
                    </div>
                    {i.abnormalities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {i.abnormalities.map((a) => {
                          const opt = ABNORMALITY_OPTIONS.find((o) => o.value === a);
                          return (
                            <span
                              key={a}
                              className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-safe-danger border border-red-100"
                            >
                              {opt?.label || a}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {i.remarks && (
                      <div className="text-xs text-industrial-500 mt-2 italic border-l-2 border-industrial-200 pl-2">
                        {i.remarks}
                      </div>
                    )}
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

function HistoryTab({
  inspections,
  stalls,
  onView,
}: {
  inspections: InspectionRecord[];
  stalls: Stall[];
  onView: (i: InspectionRecord) => void;
}) {
  const stallMap = new Map(stalls.map((s) => [s.id, s]));
  if (inspections.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileText className="mx-auto text-industrial-300 mb-3" size={48} />
        <p className="text-industrial-500">暂无巡检记录</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>摊位</th>
              <th>巡检员</th>
              <th>实测负载</th>
              <th>是否超载</th>
              <th>异常项</th>
              <th>结果</th>
              <th>巡检时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => {
              const stall = stallMap.get(i.stallId);
              const rated = stall?.ratedCapacity || 1;
              const rate = i.measuredLoad / rated;
              return (
                <tr key={i.id}>
                  <td>
                    <div className="font-medium">{stall?.code}</div>
                    {stall && <StallTypeBadge type={stall.stallType} />}
                  </td>
                  <td>{i.inspectorName}</td>
                  <td>
                    <div className="font-semibold">
                      {i.measuredLoad.toFixed(2)}kW
                      <span className="text-xs text-industrial-400 ml-1">
                        ({(rate * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </td>
                  <td>
                    {i.isOverload ? (
                      <span className="badge badge-danger w-fit">超载</span>
                    ) : (
                      <span className="badge badge-success w-fit">正常</span>
                    )}
                  </td>
                  <td>
                    {i.abnormalities.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {i.abnormalities.slice(0, 3).map((a) => {
                          const opt = ABNORMALITY_OPTIONS.find((o) => o.value === a);
                          return (
                            <span
                              key={a}
                              className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-safe-danger"
                            >
                              {opt?.label || a}
                            </span>
                          );
                        })}
                        {i.abnormalities.length > 3 && (
                          <span className="text-xs text-industrial-400">
                            +{i.abnormalities.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-industrial-400 text-xs">-</span>
                    )}
                  </td>
                  <td>
                    <InspectionResultBadge result={i.inspectionResult} />
                  </td>
                  <td className="text-xs text-industrial-500">
                    {formatDateTime(i.inspectedAt)}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onView(i)}
                      className="btn-ghost text-xs"
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
  );
}

function InspectionFormModal({
  stall,
  box,
  applications,
  measuredLoad,
  setMeasuredLoad,
  abnormalities,
  setAbnormalities,
  remarks,
  setRemarks,
  onCancel,
  onSubmit,
  onSuspend,
  onLimit,
}: {
  stall: Stall;
  box: any;
  applications: any[];
  measuredLoad: number;
  setMeasuredLoad: (n: number) => void;
  abnormalities: string[];
  setAbnormalities: (a: string[]) => void;
  remarks: string;
  setRemarks: (s: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onSuspend: () => void;
  onLimit: () => void;
}) {
  const isOverload = measuredLoad > stall.ratedCapacity * HIGH_LOAD_THRESHOLD;
  const isAbnormal = isOverload || abnormalities.length > 0;
  const rate =
    stall.ratedCapacity > 0 ? measuredLoad / stall.ratedCapacity : 0;

  const boostApp = applications?.find(
    (a: any) => a.stallId === stall.id && a.status === "connected" && a.applicationType === ApplicationType.TEMPORARY_BOOST
  );
  const approvedPower = boostApp?.approvedBoostPower ?? boostApp?.peakPower;
  const isBoostOverloaded = boostApp && approvedPower != null && measuredLoad > 0 && measuredLoad > approvedPower;

  function toggleAbnormality(v: string) {
    if (abnormalities.includes(v)) {
      setAbnormalities(abnormalities.filter((x) => x !== v));
    } else {
      setAbnormalities([...abnormalities, v]);
    }
  }

  return (
    <Modal
      title={`安全巡检 - ${stall.code} ${stall.name}`}
      size="xl"
      onClose={onCancel}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-industrial-500 mb-1">摊位信息</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{stall.code}</span>
              <div className="flex items-center gap-1">
                <StallTypeBadge type={stall.stallType} />
                <StallStatusBadge status={stall.status} />
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">配电箱</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{box?.code}</span>
              <LineStatusBadge status={box?.lineStatus} />
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">摊位额定容量</div>
            <div className="input bg-industrial-50 font-semibold flex items-center justify-between">
              <span>{formatKW(stall.ratedCapacity)}</span>
              {boostApp && <ApplicationTypeBadge type={ApplicationType.TEMPORARY_BOOST} />}
            </div>
          </div>
        </div>

        {boostApp && approvedPower != null && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="text-xs text-amber-700 font-semibold mb-1 flex items-center gap-1">
              <Activity size={12} /> 临时扩容信息
            </div>
            <div className="flex items-center gap-4 text-xs text-industrial-600">
              <span>审批扩容功率: <b className="text-amber-700">{formatKW(approvedPower)}</b></span>
              <span>额定容量: <b>{formatKW(stall.ratedCapacity)}</b></span>
            </div>
            {isBoostOverloaded && measuredLoad > 0 && (
              <div className="mt-2 p-2 rounded bg-red-50 border border-red-200 text-xs text-safe-danger flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                实测负载 {formatKW(measuredLoad)} &gt; 审批功率 {formatKW(approvedPower)}，建议限电
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg">
          <div className="label-required flex items-center gap-1 mb-2">
            <Gauge size={14} /> 实测负载 (kW)
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <input
                type="number"
                className="input text-xl font-bold text-industrial-800"
                step="0.01"
                min="0"
                placeholder="请输入实测功率"
                value={measuredLoad || ""}
                onChange={(e) =>
                  setMeasuredLoad(parseFloat(e.target.value) || 0)
                }
              />
              <div className="mt-2">
                <div className="progress-bar h-3">
                  <div
                    className={`progress-fill ${
                      rate > 0.9
                        ? "bg-safe-danger"
                        : rate > HIGH_LOAD_THRESHOLD
                        ? "bg-safe-warning"
                        : "bg-safe-success"
                    }`}
                    style={{ width: `${Math.min(rate * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-industrial-500">
                    0 / {stall.ratedCapacity}kW
                  </span>
                  <span
                    className={`font-semibold ${
                      isOverload ? "text-safe-danger" : "text-industrial-600"
                    }`}
                  >
                    {(rate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            {isOverload && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-safe-danger text-sm whitespace-nowrap">
                <AlertTriangle size={18} className="inline mr-1 -mt-0.5" />
                检测到超载！
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-industrial-500 mb-2 flex items-center gap-1">
            <ListChecks size={14} /> 现场检查异常项（可多选）
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {ABNORMALITY_OPTIONS.map((opt) => {
              const selected = abnormalities.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`p-2.5 rounded-lg border-2 cursor-pointer text-sm transition-all ${
                    selected
                      ? "border-safe-danger bg-red-50 text-safe-danger"
                      : "border-industrial-100 hover:border-industrial-200 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selected}
                    onChange={() => toggleAbnormality(opt.value)}
                  />
                  <div className="flex items-center gap-2">
                    {selected ? (
                      <XCircle size={16} />
                    ) : (
                      <div className="w-4 h-4 rounded border-2 border-industrial-200" />
                    )}
                    <span className="font-medium">{opt.label}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs text-industrial-500 mb-1 block">
            <Camera size={12} className="inline mr-1 -mt-0.5" />
            巡检备注（现场情况说明、照片编号等）
          </label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="记录现场其他发现、照片编号、建议措施等..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {isAbnormal && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 text-safe-danger font-semibold">
              <ShieldAlert size={18} />
              安全预警
            </div>
            <p className="text-sm text-industrial-700">
              检测到以下安全隐患：
            </p>
            <ul className="text-sm text-industrial-700 list-disc pl-5 space-y-0.5">
              {isOverload && (
                <li>
                  实测负载超载（
                  <b>{(rate * 100).toFixed(1)}%</b> 阈值 {HIGH_LOAD_THRESHOLD * 100}%）
                </li>
              )}
              {isBoostOverloaded && (
                <li>
                  临时扩容超载（实测 <b>{formatKW(measuredLoad)}</b> &gt; 审批 <b>{formatKW(approvedPower!)}</b>）
                </li>
              )}
              {abnormalities.length > 0 && (
                <li>
                  <b>{abnormalities.length}</b> 项现场安全隐患
                </li>
              )}
            </ul>
            <div className="pt-2 flex justify-end gap-2">
              {isBoostOverloaded && (
                <button
                  type="button"
                  onClick={onLimit}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <AlertTriangle size={14} /> 限电待整改
                </button>
              )}
              <button
                type="button"
                onClick={onSuspend}
                className="btn-danger text-xs"
              >
                <PauseCircle size={14} /> 立即暂停该摊位供电
              </button>
            </div>
          </div>
        )}

        {!isAbnormal && measuredLoad > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-safe-success text-sm flex items-center gap-2">
            <CheckCircle size={18} />
            本次巡检正常，未发现安全隐患
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={measuredLoad <= 0}
            className="btn-primary"
          >
            {isAbnormal ? (
              <>
                <AlertTriangle size={16} /> 记录异常
              </>
            ) : (
              <>
                <CheckCircle size={16} /> 记录正常
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SuspendModal({
  stall,
  reason,
  setReason,
  onCancel,
  onConfirm,
}: {
  stall: Stall;
  reason: string;
  setReason: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const presets = [
    "用电超载，超过安全阈值",
    "巡检发现接线松动/线缆破损",
    "接地不良，漏电保护失效",
    "现场温度过高，有火灾风险",
    "淋水风险，存在触电隐患",
  ];
  return (
    <Modal
      title={`确认暂停供电 - ${stall.code}`}
      size="md"
      onClose={onCancel}
    >
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-safe-danger font-semibold">
            <PauseCircle size={18} /> 暂停供电
          </div>
          <p className="text-sm text-industrial-700">
            该摊位将立即停止供电，商户需整改完成后由巡检员确认方可恢复。
          </p>
        </div>

        <div>
          <div className="label-required flex items-center gap-1">
            <Activity size={14} /> 暂停原因
          </div>
          <textarea
            className="textarea"
            rows={3}
            placeholder="请详细说明暂停供电的原因和依据..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs text-industrial-500 mb-2">快捷填入：</div>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className="text-xs px-2 py-1 rounded-full border border-industrial-200 hover:bg-industrial-50 text-industrial-600"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="btn-danger"
          >
            <PauseCircle size={16} /> 确认暂停
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LimitModal({
  stall,
  reason,
  setReason,
  onCancel,
  onConfirm,
}: {
  stall: Stall;
  reason: string;
  setReason: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const presets = [
    "临时扩容超载，实测功率超过审批值",
    "用电超载，需整改后降低负载",
    "扩容期满未降载，限电待整改",
  ];
  return (
    <Modal
      title={`限电待整改 - ${stall.code}`}
      size="md"
      onClose={onCancel}
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-amber-600 font-semibold">
            <AlertTriangle size={18} /> 限电待整改
          </div>
          <p className="text-sm text-industrial-700">
            该摊位将进入限电待整改状态，商户需降低负载或完成整改后由巡检员确认方可恢复正常供电。
          </p>
        </div>

        <div>
          <div className="label-required flex items-center gap-1">
            <Activity size={14} /> 限电原因
          </div>
          <textarea
            className="textarea"
            rows={3}
            placeholder="请详细说明限电的原因和依据..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div>
          <div className="text-xs text-industrial-500 mb-2">快捷填入：</div>
          <div className="flex flex-wrap gap-1">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className="text-xs px-2 py-1 rounded-full border border-amber-200 hover:bg-amber-50 text-amber-700"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="text-sm px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AlertTriangle size={16} /> 确认限电
          </button>
        </div>
      </div>
    </Modal>
  );
}

function RestoreModal({
  stall,
  remark,
  setRemark,
  onCancel,
  onConfirm,
}: {
  stall: Stall;
  remark: string;
  setRemark: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title={`恢复供电 - ${stall.code}`}
      size="md"
      onClose={onCancel}
    >
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-safe-success font-semibold">
            <PlayCircle size={18} /> 恢复供电
          </div>
          <p className="text-sm text-industrial-700">
            隐患已整改完成，确认恢复该摊位正常供电？
          </p>
        </div>

        <div>
          <label className="text-xs text-industrial-500 mb-1 block">
            <Calendar size={12} className="inline mr-1" />
            整改说明
          </label>
          <textarea
            className="textarea"
            rows={3}
            placeholder="整改措施、复验结果、人员签名等（可选）"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="btn-secondary">
            取消
          </button>
          <button type="button" onClick={onConfirm} className="btn-success">
            <PlayCircle size={16} /> 确认恢复
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InspectionDetailModal({
  record,
  stall,
  onClose,
}: {
  record: InspectionRecord;
  stall?: Stall;
  onClose: () => void;
}) {
  const rate =
    stall && stall.ratedCapacity > 0 ? record.measuredLoad / stall.ratedCapacity : 0;
  return (
    <Modal title="巡检记录详情" size="lg" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-3">
          <div>
            <div className="text-xs text-industrial-500 mb-1">摊位</div>
            <div className="input bg-industrial-50 text-sm">
              {stall?.code || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">巡检员</div>
            <div className="input bg-industrial-50 text-sm">
              {record.inspectorName}
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">结果</div>
            <div className="h-[38px] flex items-center">
              <InspectionResultBadge result={record.inspectionResult} />
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">时间</div>
            <div className="input bg-industrial-50 text-xs">
              {formatDateTime(record.inspectedAt)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-r from-blue-50 to-white border border-blue-100 rounded-lg">
          <div className="text-xs text-industrial-500 mb-2">实测负载</div>
          <div className="text-3xl font-bold text-industrial-800">
            {record.measuredLoad.toFixed(2)}
            <span className="text-sm font-normal text-industrial-500 ml-1">
              kW
            </span>
            {stall && (
              <span className="text-sm font-normal text-industrial-400 ml-2">
                / {stall.ratedCapacity}kW ({(rate * 100).toFixed(1)}%)
              </span>
            )}
            {record.isOverload && (
              <span className="badge badge-danger ml-3">超载</span>
            )}
          </div>
        </div>

        {record.abnormalities.length > 0 && (
          <div>
            <div className="text-xs text-industrial-500 mb-2">异常项</div>
            <div className="flex flex-wrap gap-2">
              {record.abnormalities.map((a) => {
                const opt = ABNORMALITY_OPTIONS.find((o) => o.value === a);
                return (
                  <span
                    key={a}
                    className="px-3 py-1.5 rounded-full bg-red-50 text-safe-danger border border-red-200 text-sm"
                  >
                    <XCircle size={14} className="inline mr-1 -mt-0.5" />
                    {opt?.label || a}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {record.remarks && (
          <div>
            <div className="text-xs text-industrial-500 mb-2">巡检备注</div>
            <div className="p-4 bg-industrial-50 rounded-lg text-sm text-industrial-700 whitespace-pre-wrap">
              {record.remarks}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SuspensionDetailModal({
  record,
  stall,
  inspection,
  onClose,
}: {
  record: SuspensionRecord;
  stall?: Stall;
  inspection?: InspectionRecord;
  onClose: () => void;
}) {
  return (
    <Modal title="暂停/恢复详情" size="md" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-industrial-50 flex items-center justify-between">
          <div>
            <div className="font-semibold text-industrial-800">
              {stall?.code} {stall?.name}
            </div>
            <div className="text-xs text-industrial-500 mt-0.5">
              执行：{record.operatorName}
            </div>
          </div>
          <SuspensionStatusBadge status={record.status} />
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 text-sm">
            <span className="text-industrial-500 w-20 shrink-0">暂停原因</span>
            <span className="text-industrial-700 flex-1">{record.reason}</span>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="text-industrial-500 w-20 shrink-0">暂停时间</span>
            <span className="text-industrial-700 flex-1">
              {formatDateTime(record.suspendedAt)}
            </span>
          </div>
          {record.status === SuspensionStatus.RESTORED && (
            <>
              <div className="flex gap-2 text-sm">
                <span className="text-industrial-500 w-20 shrink-0">恢复人</span>
                <span className="text-industrial-700 flex-1">
                  {record.restorerName}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-industrial-500 w-20 shrink-0">恢复时间</span>
                <span className="text-industrial-700 flex-1">
                  {record.restoredAt && formatDateTime(record.restoredAt)}
                </span>
              </div>
              <div className="flex gap-2 text-sm">
                <span className="text-industrial-500 w-20 shrink-0">整改说明</span>
                <span className="text-industrial-700 flex-1">
                  {record.restoreRemark || "-"}
                </span>
              </div>
            </>
          )}
        </div>

        {inspection && (
          <div className="p-3 border border-orange-100 bg-orange-50 rounded-lg">
            <div className="text-xs text-industrial-500 mb-1 flex items-center gap-1">
              <FileText size={12} /> 关联巡检记录
            </div>
            <div className="text-sm text-industrial-700">
              {inspection.inspectorName} ·{" "}
              {formatDateTime(inspection.inspectedAt)}
            </div>
            <div className="text-sm mt-1">
              实测 <b>{inspection.measuredLoad.toFixed(2)}kW</b>
              {inspection.isOverload && (
                <span className="text-safe-danger ml-1">超载</span>
              )}
              {inspection.abnormalities.length > 0 && (
                <span className="text-industrial-500">
                  {" "}· {inspection.abnormalities.length}项隐患
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
