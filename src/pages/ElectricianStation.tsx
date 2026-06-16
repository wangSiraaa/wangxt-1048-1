import React, { useMemo, useState } from "react";
import {
  Zap,
  Lock,
  CheckCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Eye,
  MapPin,
  User,
  Phone,
  Hash,
  Calendar,
  Activity,
  Clipboard,
  Gauge,
} from "lucide-react";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useBoxStore } from "@/store/useBoxStore";
import { useStallStore } from "@/store/useStallStore";
import { useConnectionStore } from "@/store/useConnectionStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/common/Toast";
import Modal from "@/components/common/Modal";
import {
  ApplicationStatusBadge,
  LineStatusBadge,
  StallStatusBadge,
  StallTypeBadge,
} from "@/components/common/StatusBadge";
import CapacityCard, { buildBoxInfo } from "@/components/capacity/CapacityCard";
import {
  UserRole,
  ApplicationStatus,
  LineStatus,
  LineStatusLabel,
  StallType,
  WarningLevel,
} from "@/types/enums";
import { ElectricityApplication, ConnectionRecord } from "@/types";
import { calcBoxRemainingCapacity, formatKW } from "@/utils/capacity";
import { validateConnection, validateStallLock } from "@/utils/validation";
import { formatDateTime } from "@/utils/time";
import DeviceListEditor from "@/components/form/DeviceListEditor";

type TabKey = "pending" | "connected" | "history";

export default function ElectricianStation() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  if (currentRole !== UserRole.ELECTRICIAN) {
    return (
      <div className="card p-12 text-center">
        <Lock className="mx-auto text-industrial-300 mb-3" size={48} />
        <h3 className="text-lg font-semibold text-industrial-800 mb-2">
          无权限访问
        </h3>
        <p className="text-sm text-industrial-500">
          该工作台仅【电工】可访问，请切换角色。
        </p>
      </div>
    );
  }
  return <ElectricianInner />;
}

function ElectricianInner() {
  const toast = useToast();
  const { applications = [], markConnected } = useApplicationStore();
  const { boxes = [] } = useBoxStore();
  const { stalls = [] } = useStallStore();
  const { records = [], addRecord } = useConnectionStore();
  const { currentUserName = "系统用户" } = useAuthStore();

  const [tab, setTab] = useState<TabKey>("pending");
  const [viewApp, setViewApp] = useState<ElectricityApplication | null>(null);
  const [connectApp, setConnectApp] = useState<ElectricityApplication | null>(null);

  const [safetyPassed, setSafetyPassed] = useState(false);
  const [signature, setSignature] = useState("");
  const [remarks, setRemarks] = useState("");

  const pendingList = useMemo(
    () =>
      applications.filter((a) => a.status === ApplicationStatus.APPROVED).sort(
        (a, b) => String(a.approvedAt || "").localeCompare(String(b.approvedAt || ""))
      ),
    [applications]
  );

  const connectedList = useMemo(
    () =>
      applications
        .filter((a) => a.status === ApplicationStatus.CONNECTED)
        .sort((a, b) => String(b.approvedAt || "").localeCompare(String(a.approvedAt || ""))),
    [applications]
  );

  const historyRecords = useMemo(
    () =>
      [...records].sort((a, b) => String(b.connectedAt || "").localeCompare(String(a.connectedAt || ""))),
    [records]
  );

  const getStall = (id: string) => stalls.find((s) => s.id === id);
  const getBox = (id: string) => boxes.find((b) => b.id === id);

  function handleConnect(app: ElectricityApplication) {
    const stall = getStall(app.stallId);
    const box = stall ? getBox(stall.distributionBoxId) : undefined;

    const lockCheck = stall ? validateStallLock(stall, "更换") : { valid: true };
    if (!lockCheck.valid) {
      toast.error(lockCheck.message!);
      return;
    }
    const check = validateConnection(app, stall, box, stalls, safetyPassed);
    if (!check.valid) {
      toast.error(check.message!);
      return;
    }
    if (!signature.trim()) {
      toast.error("请输入电工签名确认");
      return;
    }
    addRecord({
      applicationId: app.id,
      stallId: app.stallId,
      electricianName: currentUserName || signature.trim(),
      remainingCapacity: calcBoxRemainingCapacity(box!, stalls),
      lineStatusCheck: box!.lineStatus,
      safetyCheckResult: safetyPassed ? "pass" : "fail",
      signature: signature.trim(),
      remarks: remarks.trim() || undefined,
    });
    markConnected(app.id);
    toast.success("接电完成，摊位已锁定");
    setConnectApp(null);
    setSafetyPassed(false);
    setSignature("");
    setRemarks("");
  }

  function resetConnectForm() {
    setSafetyPassed(false);
    setSignature("");
    setRemarks("");
  }

  const pendingBoxes = useMemo(
    () =>
      boxes.map((b) => buildBoxInfo(b, stalls)).sort(
        (a, b) => b.usageRate - a.usageRate
      ),
    [boxes, stalls]
  );

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 text-safe-warning flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-industrial-800">电工接电台</h2>
            <p className="text-xs text-industrial-500 mt-0.5">
              核对剩余容量与线路状态，完成接电并签字确认
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="stat-card bg-gradient-to-br from-blue-50 to-white border-l-4 border-safe-info">
            <div className="text-2xl font-bold text-industrial-800">{pendingList.length}</div>
            <div className="text-xs text-industrial-500 mt-1">待接电申请</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-green-50 to-white border-l-4 border-safe-success">
            <div className="text-2xl font-bold text-industrial-800">{connectedList.length}</div>
            <div className="text-xs text-industrial-500 mt-1">已接电摊位</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-orange-50 to-white border-l-4 border-orange-400">
            <div className="text-2xl font-bold text-industrial-800">
              {boxes.filter((b) => b.lineStatus !== LineStatus.NORMAL).length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">异常线路数</div>
          </div>
          <div className="stat-card bg-gradient-to-br from-red-50 to-white border-l-4 border-safe-danger">
            <div className="text-2xl font-bold text-industrial-800">
              {pendingBoxes.filter((b) => b.level === WarningLevel.DANGER).length}
            </div>
            <div className="text-xs text-industrial-500 mt-1">超载配电箱</div>
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={tab === "pending" ? "tab-active" : "tab-inactive"}
          >
            <Clipboard size={14} />
            待接电 ({pendingList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("connected")}
            className={tab === "connected" ? "tab-active" : "tab-inactive"}
          >
            <CheckCircle size={14} />
            已接电摊位 ({connectedList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={tab === "history" ? "tab-active" : "tab-inactive"}
          >
            <FileText size={14} />
            接电记录 ({historyRecords.length})
          </button>
        </div>
      </div>

      {pendingBoxes.some((b) => b.level !== WarningLevel.INFO) &&
        tab === "pending" && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-industrial-700 mb-3 flex items-center gap-2">
              <Gauge size={16} className="text-safe-warning" />
              配电箱容量监测
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingBoxes.map((bi) => (
                <CapacityCard key={bi.box.id} info={bi} compact />
              ))}
            </div>
          </div>
        )}

      {tab === "pending" && (
        <PendingTab
          list={pendingList}
          getStall={getStall}
          getBox={getBox}
          onConnect={(a) => {
            setConnectApp(a);
            resetConnectForm();
          }}
          onView={(a) => setViewApp(a)}
        />
      )}

      {tab === "connected" && (
        <ConnectedTab
          list={connectedList}
          getStall={getStall}
          getBox={getBox}
          onView={(a) => setViewApp(a)}
        />
      )}

      {tab === "history" && (
        <HistoryTab
          records={historyRecords}
          getStall={getStall}
          applications={applications}
        />
      )}

      {viewApp && (
        <ApplicationDetailModal
          app={viewApp}
          onClose={() => setViewApp(null)}
          getStall={getStall}
          getBox={getBox}
        />
      )}

      {connectApp && (
        <ConnectModal
          app={connectApp}
          getStall={getStall}
          getBox={getBox}
          allStalls={stalls}
          safetyPassed={safetyPassed}
          setSafetyPassed={setSafetyPassed}
          signature={signature}
          setSignature={setSignature}
          remarks={remarks}
          setRemarks={setRemarks}
          onCancel={() => {
            setConnectApp(null);
            resetConnectForm();
          }}
          onConfirm={() => handleConnect(connectApp)}
        />
      )}
    </div>
  );
}

function PendingTab({
  list,
  getStall,
  getBox,
  onConnect,
  onView,
}: {
  list: ElectricityApplication[];
  getStall: (id: string) => any;
  getBox: (id: string) => any;
  onConnect: (a: ElectricityApplication) => void;
  onView: (a: ElectricityApplication) => void;
}) {
  if (list.length === 0) {
    return (
      <div className="card p-12 text-center">
        <CheckCircle className="mx-auto text-safe-success/50 mb-3" size={48} />
        <p className="text-industrial-500">当前暂无待接电申请</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>申请单号</th>
              <th>商户信息</th>
              <th>摊位信息</th>
              <th>配电箱</th>
              <th>申请功率</th>
              <th>剩余容量</th>
              <th>审批通过时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const stall = getStall(a.stallId);
              const box = stall ? getBox(stall.distributionBoxId) : null;
              const remaining = box
                ? calcBoxRemainingCapacity(box, [stall!])
                : 0;
              const canConnect = box && a.peakPower <= remaining;
              return (
                <tr key={a.id}>
                  <td>
                    <div className="font-mono text-xs text-industrial-700">{a.id.slice(0, 10)}...</div>
                    <ApplicationStatusBadge status={a.status} />
                  </td>
                  <td>
                    <div className="font-medium text-industrial-800">{a.merchantName}</div>
                    <div className="text-xs text-industrial-500 mt-0.5 flex items-center gap-1">
                      <Phone size={12} />
                      {a.contactInfo}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm font-medium">{stall?.code}</div>
                    <div className="flex gap-1 mt-0.5">
                      {stall && <StallStatusBadge status={stall.status} />}
                      {stall && <StallTypeBadge type={stall.stallType} />}
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">{box?.code}</div>
                    {box && (
                      <div className="mt-0.5">
                        <LineStatusBadge status={box.lineStatus} />
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="font-semibold text-industrial-800">
                      {formatKW(a.peakPower)}
                    </div>
                  </td>
                  <td>
                    <div
                      className={`font-semibold ${
                        canConnect ? "text-safe-success" : "text-safe-danger"
                      }`}
                    >
                      {formatKW(remaining)}
                    </div>
                    {!canConnect && (
                      <div className="text-xs text-safe-danger mt-0.5 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        容量不足
                      </div>
                    )}
                  </td>
                  <td className="text-xs text-industrial-500">
                    {a.approvedAt ? formatDateTime(a.approvedAt) : "-"}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onView(a)}
                        className="btn-ghost text-xs"
                      >
                        <Eye size={14} /> 详情
                      </button>
                      <button
                        type="button"
                        onClick={() => onConnect(a)}
                        disabled={!canConnect || box?.lineStatus !== LineStatus.NORMAL}
                        className="btn-primary text-xs"
                      >
                        <Zap size={14} /> 接电
                      </button>
                    </div>
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

function ConnectedTab({
  list,
  getStall,
  getBox,
  onView,
}: {
  list: ElectricityApplication[];
  getStall: (id: string) => any;
  getBox: (id: string) => any;
  onView: (a: ElectricityApplication) => void;
}) {
  if (list.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileText className="mx-auto text-industrial-300 mb-3" size={48} />
        <p className="text-industrial-500">暂无已接电摊位</p>
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
              <th>商户</th>
              <th>配电箱</th>
              <th>接入功率</th>
              <th>占用情况</th>
              <th>摊位锁定</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const stall = getStall(a.stallId);
              const box = stall ? getBox(stall.distributionBoxId) : null;
              const rate =
                stall && stall.ratedCapacity > 0
                  ? stall.occupiedCapacity / stall.ratedCapacity
                  : 0;
              return (
                <tr key={a.id}>
                  <td>
                    <div className="font-medium">{stall?.code}</div>
                    <StallTypeBadge type={stall?.stallType} />
                  </td>
                  <td>
                    <div className="font-medium">{a.merchantName}</div>
                    <div className="text-xs text-industrial-500">{a.contactInfo}</div>
                  </td>
                  <td>
                    <div>{box?.code}</div>
                    {box && <LineStatusBadge status={box.lineStatus} />}
                  </td>
                  <td className="font-semibold">{formatKW(a.peakPower)}</td>
                  <td>
                    <div className="w-24">
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            rate > 0.9 ? "bg-safe-danger" : rate > 0.75 ? "bg-safe-warning" : "bg-safe-success"
                          }`}
                          style={{ width: `${Math.min(rate * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs mt-1 text-industrial-500">
                        {formatKW(stall?.occupiedCapacity || 0)}/
                        {formatKW(stall?.ratedCapacity || 0)}
                      </div>
                    </div>
                  </td>
                  <td>
                    {stall?.locked ? (
                      <span className="badge badge-info flex items-center gap-1 w-fit">
                        <Lock size={12} /> 已锁定
                      </span>
                    ) : (
                      <span className="badge badge-secondary w-fit">未锁定</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onView(a)}
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

function HistoryTab({
  records,
  getStall,
  applications,
}: {
  records: ConnectionRecord[];
  getStall: (id: string) => any;
  applications: ElectricityApplication[];
}) {
  if (records.length === 0) {
    return (
      <div className="card p-12 text-center">
        <FileText className="mx-auto text-industrial-300 mb-3" size={48} />
        <p className="text-industrial-500">暂无接电记录</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>记录编号</th>
              <th>摊位</th>
              <th>商户</th>
              <th>电工</th>
              <th>线路检查</th>
              <th>安全检查</th>
              <th>接电时剩余容量</th>
              <th>接电时间</th>
              <th>签名</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => {
              const stall = getStall(r.stallId);
              const app = applications.find((a) => a.id === r.applicationId);
              return (
                <tr key={r.id}>
                  <td className="font-mono text-xs">{r.id.slice(0, 10)}...</td>
                  <td>{stall?.code}</td>
                  <td>{app?.merchantName}</td>
                  <td>{r.electricianName}</td>
                  <td><LineStatusBadge status={r.lineStatusCheck} /></td>
                  <td>
                    {r.safetyCheckResult === "pass" ? (
                      <span className="badge badge-success w-fit">
                        <ShieldCheck size={12} /> 已通过
                      </span>
                    ) : (
                      <span className="badge badge-danger w-fit">
                        <XCircle size={12} /> 未通过
                      </span>
                    )}
                  </td>
                  <td className="font-semibold">{formatKW(r.remainingCapacity)}</td>
                  <td className="text-xs text-industrial-500">
                    {formatDateTime(r.connectedAt)}
                  </td>
                  <td className="font-handwriting text-safe-info">{r.signature}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApplicationDetailModal({
  app,
  onClose,
  getStall,
  getBox,
}: {
  app: ElectricityApplication;
  onClose: () => void;
  getStall: (id: string) => any;
  getBox: (id: string) => any;
}) {
  const stall = getStall(app.stallId);
  const box = stall ? getBox(stall.distributionBoxId) : null;
  return (
    <Modal title="申请单详情" size="lg" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-industrial-500 mb-1">申请单号</div>
            <div className="font-mono text-sm bg-industrial-50 p-2 rounded">
              {app.id}
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">申请状态</div>
            <ApplicationStatusBadge status={app.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label-required"><User size={14} /> 商户名称</div>
            <div className="input bg-industrial-50">{app.merchantName}</div>
          </div>
          <div>
            <div className="label-required"><Phone size={14} /> 联系方式</div>
            <div className="input bg-industrial-50">{app.contactInfo}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-industrial-500 mb-1">摊位</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{stall?.code}</span>
              <StallTypeBadge type={stall?.stallType} />
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">配电箱</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{box?.code}</span>
              {box && <LineStatusBadge status={box.lineStatus} />}
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">峰值功率</div>
            <div className="input bg-industrial-50 font-semibold text-safe-info">
              {formatKW(app.peakPower)}
            </div>
          </div>
        </div>

        {app.isFoodStall && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xs text-industrial-500 mb-1 flex items-center gap-1">
              <Hash size={12} /> 食品经营许可证编号
            </div>
            <div className="font-medium text-industrial-800">
              {app.foodLicenseNo || "-"}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs text-industrial-500 mb-2 flex items-center gap-1">
            <Activity size={12} /> 设备清单
          </div>
          <DeviceListEditor
            value={(app.devices || []).map(d => ({
              deviceName: d.deviceName,
              quantity: Number(d.quantity) || 0,
              unitPower: Number(d.unitPower) || 0,
              totalPower: d.totalPower ?? (Number(d.quantity) || 0) * (Number(d.unitPower) || 0),
            }))}
            onChange={() => {}}
            disabled
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-industrial-500 mb-1"><Calendar size={12} /> 活动时段</div>
            <div className="input bg-industrial-50">{app.activityPeriod}</div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">申请时间</div>
            <div className="input bg-industrial-50">{formatDateTime(app.createdAt)}</div>
          </div>
        </div>

        {app.requirementDesc && (
          <div>
            <div className="text-xs text-industrial-500 mb-1"><MapPin size={12} /> 需求说明</div>
            <textarea
              className="textarea bg-industrial-50"
              rows={2}
              disabled
              value={app.requirementDesc}
            />
          </div>
        )}

        {app.approverName && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-safe-info" />
              <span className="text-sm font-semibold text-industrial-800">
                审批信息
              </span>
            </div>
            <div className="text-sm">
              审批人：<span className="font-medium">{app.approverName}</span>
              <span className="mx-2 text-industrial-300">|</span>
              时间：{app.approvedAt ? formatDateTime(app.approvedAt) : "-"}
            </div>
            <div className="text-sm">
              意见：
              <span className="font-medium">{app.approvalOpinion || "无"}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ConnectModal({
  app,
  getStall,
  getBox,
  allStalls,
  safetyPassed,
  setSafetyPassed,
  signature,
  setSignature,
  remarks,
  setRemarks,
  onCancel,
  onConfirm,
}: {
  app: ElectricityApplication;
  getStall: (id: string) => any;
  getBox: (id: string) => any;
  allStalls: any[];
  safetyPassed: boolean;
  setSafetyPassed: (b: boolean) => void;
  signature: string;
  setSignature: (s: string) => void;
  remarks: string;
  setRemarks: (s: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const stall = getStall(app.stallId);
  const box = stall ? getBox(stall.distributionBoxId) : null;
  const remaining = box ? calcBoxRemainingCapacity(box, allStalls) : 0;
  const check = validateConnection(app, stall, box, allStalls, safetyPassed);
  const canSubmit = check.valid && signature.trim().length > 0;

  return (
    <Modal
      title={`接电确认 - ${stall?.code} / ${app.merchantName}`}
      size="lg"
      onClose={onCancel}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="stat-card bg-blue-50 border-l-4 border-safe-info">
            <div className="text-xs text-industrial-500">申请功率</div>
            <div className="text-xl font-bold text-industrial-800 mt-1">
              {formatKW(app.peakPower)}
            </div>
          </div>
          <div
            className={`stat-card border-l-4 ${
              remaining >= app.peakPower
                ? "bg-green-50 border-safe-success"
                : "bg-red-50 border-safe-danger"
            }`}
          >
            <div className="text-xs text-industrial-500">剩余容量</div>
            <div
              className={`text-xl font-bold mt-1 ${
                remaining >= app.peakPower ? "text-safe-success" : "text-safe-danger"
              }`}
            >
              {formatKW(remaining)}
            </div>
          </div>
          <div className="stat-card bg-yellow-50 border-l-4 border-safe-warning">
            <div className="text-xs text-industrial-500">差额</div>
            <div className="text-xl font-bold text-industrial-800 mt-1">
              {formatKW(remaining - app.peakPower)}
            </div>
          </div>
        </div>

        {!check.valid && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-safe-danger text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>无法接电：{check.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-industrial-500 mb-1">配电箱</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{box?.code} - {box?.location}</span>
              {box && <LineStatusBadge status={box.lineStatus} />}
            </div>
          </div>
          <div>
            <div className="text-xs text-industrial-500 mb-1">摊位</div>
            <div className="input bg-industrial-50 flex items-center justify-between">
              <span>{stall?.code} - {stall?.name}</span>
              {stall?.locked && (
                <span className="badge badge-info flex items-center gap-1 w-fit">
                  <Lock size={10} /> 锁定
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="divider" />

        <div>
          <div className="label-required flex items-center gap-1">
            <ShieldCheck size={14} /> 现场安全检查
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <label
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                safetyPassed
                  ? "border-safe-success bg-green-50"
                  : "border-industrial-100 hover:border-industrial-200"
              }`}
            >
              <input
                type="radio"
                name="safety"
                checked={safetyPassed}
                onChange={() => setSafetyPassed(true)}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <CheckCircle
                  size={20}
                  className={safetyPassed ? "text-safe-success" : "text-industrial-300"}
                />
                <span
                  className={`font-medium ${
                    safetyPassed ? "text-safe-success" : "text-industrial-600"
                  }`}
                >
                  检查通过
                </span>
              </div>
              <p className="text-xs text-industrial-500 mt-1">
                接地、漏保、绝缘、线缆合格
              </p>
            </label>
            <label
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                !safetyPassed
                  ? "border-safe-danger bg-red-50"
                  : "border-industrial-100 hover:border-industrial-200"
              }`}
            >
              <input
                type="radio"
                name="safety"
                checked={!safetyPassed}
                onChange={() => setSafetyPassed(false)}
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <XCircle
                  size={20}
                  className={!safetyPassed ? "text-safe-danger" : "text-industrial-300"}
                />
                <span
                  className={`font-medium ${
                    !safetyPassed ? "text-safe-danger" : "text-industrial-600"
                  }`}
                >
                  检查不通过
                </span>
              </div>
              <p className="text-xs text-industrial-500 mt-1">
                存在安全隐患，禁止接电
              </p>
            </label>
          </div>
        </div>

        <div>
          <div className="label-required">电工签名确认</div>
          <input
            type="text"
            className="input font-handwriting text-lg text-safe-info"
            placeholder="请输入姓名作为电子签名"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
          {signature && (
            <p className="text-xs text-industrial-400 mt-1">
              以上签名将作为接电确认凭证
            </p>
          )}
        </div>

        <div>
          <label className="text-xs text-industrial-500 mb-1 block">
            备注信息
          </label>
          <textarea
            className="textarea"
            rows={2}
            placeholder="线路特殊情况、额外说明等（可选）"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
          <Lock size={16} className="mt-0.5 shrink-0" />
          <span>
            接电完成后，摊位将被<b>锁定</b>，商户<b>不可更换摊位</b>。请确认信息无误后执行。
          </span>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={onConfirm}
            className="btn-primary"
          >
            <Zap size={16} /> 确认接电并锁定
          </button>
        </div>
      </div>
    </Modal>
  );
}
