import React, { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Server,
  Zap,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Check,
  XCircle,
  FileCheck,
  Eye,
  RotateCcw,
  Lock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useBoxStore } from "@/store/useBoxStore";
import { useStallStore } from "@/store/useStallStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/common/Toast";
import Modal from "@/components/common/Modal";
import StallGrid from "@/components/stall/StallGrid";
import CapacityCard, { buildBoxInfo } from "@/components/capacity/CapacityCard";
import CapacityBreakdownPanel from "@/components/capacity/CapacityBreakdownPanel";
import {
  ApplicationStatusBadge,
  ApplicationTypeBadge,
  LineStatusBadge,
  StallStatusBadge,
  StallTypeBadge,
} from "@/components/common/StatusBadge";
import {
  UserRole,
  StallType,
  StallTypeLabel,
  LineStatus,
  LineStatusLabel,
  ApplicationStatus,
  ApplicationType,
  ApplicationTypeLabel,
  StallStatus,
} from "@/types/enums";
import { Stall, DistributionBox, CapacityBreakdown } from "@/types";
import { formatKW, buildCapacityBreakdown, checkDuplicateHighPowerDevices } from "@/utils/capacity";
import { formatDateTime, formatDate } from "@/utils/time";
import DeviceListEditor, { DeviceRow, createEmptyRow } from "@/components/form/DeviceListEditor";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

type TabKey = "stalls" | "boxes" | "approvals";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "stalls", label: "摊位管理", icon: <Zap size={16} /> },
  { key: "boxes", label: "配电箱管理", icon: <Server size={16} /> },
  { key: "approvals", label: "申请审批", icon: <FileCheck size={16} /> },
];

export default function OperationWorkbench() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  if (currentRole !== UserRole.OPERATION) {
    return (
      <div className="card p-12 text-center">
        <Lock className="mx-auto text-industrial-300 mb-3" size={48} />
        <h3 className="text-lg font-semibold text-industrial-800 mb-2">
          无权限访问
        </h3>
        <p className="text-sm text-industrial-500">
          该工作台仅【运营管理员】可访问，请切换角色。
        </p>
      </div>
    );
  }
  return <OperationWorkbenchInner />;
}

function OperationWorkbenchInner() {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>("stalls");

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-safe-info flex items-center justify-center">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-industrial-800">运营工作台</h2>
            <p className="text-xs text-industrial-500 mt-0.5">
              维护摊位与配电箱信息，审批商户用电申请
            </p>
          </div>
        </div>
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={tab === t.key ? "tab-active" : "tab-inactive"}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "stalls" && <StallsPanel />}
      {tab === "boxes" && <BoxesPanel />}
      {tab === "approvals" && <ApprovalsPanel />}
    </div>
  );
}

function StallsPanel() {
  const { boxes = [] } = useBoxStore();
  const { stalls = [], updateStall, deleteStall } = useStallStore();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { addStall } = useStallStore();

  const openEdit = (s: Stall) => {
    if (s.locked) {
      toast.warning("该摊位已接电锁定，无法修改");
      return;
    }
    setEditingId(s.id);
  };

  const handleDelete = (s: Stall) => {
    const ok = deleteStall(s.id);
    if (ok) {
      toast.success(`已删除摊位 ${s.code}`);
    } else {
      toast.error("删除失败：接电锁定的摊位不能删除");
    }
  };

  const handleCreate = (form: Stall) => {
    addStall(form);
    toast.success(`已创建摊位 ${form.code}`);
    setCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-industrial-500">
          共 <span className="font-mono font-semibold text-industrial-800">{stalls.length}</span> 个摊位
        </div>
        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> 新增摊位
        </button>
      </div>

      <StallGrid
        boxes={boxes}
        stalls={stalls}
        selectedStallId={selectedId}
        onSelectStall={(s) => setSelectedId(s.id)}
      />

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-industrial-800">摊位明细</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table">
            <thead>
              <tr>
                <th>摊位编号</th>
                <th>名称</th>
                <th>类型</th>
                <th>配电箱</th>
                <th>额定容量</th>
                <th>已占用</th>
                <th>相邻摊位限制</th>
                <th>临时活动</th>
                <th>状态</th>
                <th>锁定</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {stalls.map((s) => {
                const box = boxes.find((b) => b.id === s.distributionBoxId);
                return (
                  <tr key={s.id}>
                    <td className="font-mono font-semibold">{s.code}</td>
                    <td>{s.name}</td>
                    <td>
                      <StallTypeBadge type={s.stallType} />
                    </td>
                    <td className="font-mono">{box?.code || "-"}</td>
                    <td className="font-mono text-right">{formatKW(s.ratedCapacity)}</td>
                    <td className="font-mono text-right">{formatKW(s.occupiedCapacity || 0)}</td>
                    <td>{s.adjacentLimit || "-"}</td>
                    <td>
                      {s.temporaryPeriods?.length
                        ? `${s.temporaryPeriods.length} 段时段`
                        : "-"}
                    </td>
                    <td>
                      <StallStatusBadge status={s.status} />
                    </td>
                    <td>{s.locked ? "🔒 已锁" : "-"}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className={`btn-ghost p-2 ${s.locked ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => openEdit(s)}
                          title={s.locked ? "已锁定，无法编辑" : "编辑"}
                          disabled={s.locked}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-ghost p-2 hover:!bg-red-50 hover:!text-safe-danger"
                          onClick={() => handleDelete(s)}
                          title="删除"
                        >
                          <Trash2 size={14} />
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

      {editingId && (() => {
        const editing = stalls.find(s => s.id === editingId);
        if (!editing) return null;
        return (
          <StallFormModal
            title={`编辑摊位 ${editing.code}`}
            boxes={boxes}
            initial={editing}
            onClose={() => setEditingId(null)}
            onSubmit={(form) => {
              updateStall(form.id, { ...form, updatedAt: nowISO() });
              toast.success(`已更新摊位 ${form.code}`);
              setEditingId(null);
            }}
            submitLabel="保存修改"
            mode="edit"
            locked={editing.locked}
          />
        );
      })()}

      {creating && (
        <StallFormModal
          title="新增摊位"
          boxes={boxes}
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
          submitLabel="创建摊位"
          mode="create"
        />
      )}
    </div>
  );
}

interface StallFormProps {
  title: string;
  boxes: DistributionBox[];
  initial?: Stall;
  onClose: () => void;
  onSubmit: (form: Stall) => void;
  submitLabel: string;
  mode: "edit" | "create";
  locked?: boolean;
}

function StallFormModal({ title, boxes, initial, onClose, onSubmit, submitLabel, locked }: StallFormProps) {
  const toast = useToast();
  const [form, setForm] = useState<Stall>(() => {
    if (initial) return { ...initial };
    return {
      id: genId("stall"),
      code: "",
      name: "",
      stallType: StallType.NORMAL,
      distributionBoxId: boxes[0]?.id || "",
      ratedCapacity: 10,
      occupiedCapacity: 0,
      adjacentLimit: "",
      temporaryPeriods: [],
      status: StallStatus.IDLE,
      locked: false,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      gridRow: 1,
      gridCol: 1,
    };
  });

  useEffect(() => {
    if (initial) {
      setForm({ ...initial });
    }
  }, [initial?.id]);

  const submit = () => {
    if (!form.code.trim()) return toast.error("请输入摊位编号");
    if (!form.name.trim()) return toast.error("请输入摊位名称");
    if (!form.distributionBoxId) return toast.error("请选择配电箱");
    if (form.ratedCapacity <= 0) return toast.error("额定容量需大于 0");
    onSubmit(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={14} /> 取消
          </button>
          {!locked && (
            <button type="button" className="btn-primary" onClick={submit}>
              <Save size={14} /> {submitLabel}
            </button>
          )}
        </>
      }
    >
      {locked && (
        <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
          <Lock size={16} className="mt-0.5 shrink-0" />
          该摊位已接电锁定，只能查看信息，无法修改。
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="摊位编号" required>
          <input
            className="input"
            disabled={locked}
            placeholder="如 A-01"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="摊位名称" required>
          <input
            className="input"
            disabled={locked}
            placeholder="如 东区饮品一号位"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field label="摊位类型" required>
          <select
            className="select"
            disabled={locked}
            value={form.stallType}
            onChange={(e) => setForm({ ...form, stallType: e.target.value as StallType })}
          >
            {Object.entries(StallTypeLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="所属配电箱" required>
          <select
            className="select"
            disabled={locked}
            value={form.distributionBoxId}
            onChange={(e) => setForm({ ...form, distributionBoxId: e.target.value })}
          >
            {boxes.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} - {b.location}（额定 {formatKW(b.ratedCapacity)}）
              </option>
            ))}
          </select>
        </Field>
        <Field label="额定容量 (kW)" required>
          <input
            type="number"
            step={0.5}
            min={0}
            disabled={locked}
            className="input font-mono"
            value={form.ratedCapacity}
            onChange={(e) =>
              setForm({ ...form, ratedCapacity: parseFloat(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="已占用 (kW)" hint="系统自动维护">
          <input
            type="number"
            step={0.5}
            min={0}
            disabled
            className="input font-mono bg-industrial-50"
            value={form.occupiedCapacity || 0}
          />
        </Field>
        <Field label="相邻摊位限制">
          <input
            className="input"
            disabled={locked}
            placeholder="如：不超过 5kW 同开"
            value={form.adjacentLimit || ""}
            onChange={(e) => setForm({ ...form, adjacentLimit: e.target.value })}
          />
        </Field>
        <Field label="网格行号 (gridRow)">
          <input
            type="number"
            min={1}
            disabled={locked}
            className="input font-mono"
            value={form.gridRow}
            onChange={(e) =>
              setForm({ ...form, gridRow: parseInt(e.target.value) || 1 })
            }
          />
        </Field>
        <Field label="网格列号 (gridCol)">
          <input
            type="number"
            min={1}
            disabled={locked}
            className="input font-mono"
            value={form.gridCol}
            onChange={(e) =>
              setForm({ ...form, gridCol: parseInt(e.target.value) || 1 })
            }
          />
        </Field>
      </div>
    </Modal>
  );
}

function BoxesPanel() {
  const { boxes = [], updateBox, addBox, setLineStatus } = useBoxStore();
  const { stalls = [] } = useStallStore();
  const toast = useToast();
  const [editing, setEditing] = useState<DistributionBox | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = (form: DistributionBox) => {
    addBox(form);
    toast.success(`已创建配电箱 ${form.code}`);
    setCreating(false);
  };

  const toggleLine = (b: DistributionBox) => {
    const next = b.lineStatus === LineStatus.NORMAL ? LineStatus.MAINTENANCE : LineStatus.NORMAL;
    setLineStatus(b.id, next);
    toast.success(`配电箱 ${b.code} 线路状态已切换为 ${LineStatusLabel[next]}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-industrial-500">
          共 <span className="font-mono font-semibold text-industrial-800">{boxes.length}</span> 台配电箱
        </div>
        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> 新增配电箱
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {boxes.map((b) => (
          <CapacityCard key={b.id} info={buildBoxInfo(b, stalls)} />
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-industrial-800">配电箱明细</h3>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="data-table">
            <thead>
              <tr>
                <th>编号</th>
                <th>位置</th>
                <th>额定容量</th>
                <th>线路状态</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map((b) => (
                <tr key={b.id}>
                  <td className="font-mono font-semibold">{b.code}</td>
                  <td>{b.location}</td>
                  <td className="font-mono text-right">{formatKW(b.ratedCapacity)}</td>
                  <td>
                    <LineStatusBadge status={b.lineStatus} />
                  </td>
                  <td className="text-xs text-industrial-500">{formatDateTime(b.createdAt)}</td>
                  <td className="text-xs text-industrial-500">{formatDateTime(b.updatedAt)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="btn-ghost p-2"
                        onClick={() => toggleLine(b)}
                        title="切换线路状态"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-ghost p-2"
                        onClick={() => setEditing({ ...b })}
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <BoxFormModal
          title={`编辑配电箱 ${editing.code}`}
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(form) => {
            updateBox(form.id, { ...form, updatedAt: nowISO() });
            toast.success(`已更新配电箱 ${form.code}`);
            setEditing(null);
          }}
          submitLabel="保存修改"
        />
      )}
      {creating && (
        <BoxFormModal
          title="新增配电箱"
          onClose={() => setCreating(false)}
          onSubmit={handleCreate}
          submitLabel="创建配电箱"
        />
      )}
    </div>
  );
}

function BoxFormModal({ title, initial, onClose, onSubmit, submitLabel }: {
  title: string;
  initial?: DistributionBox;
  onClose: () => void;
  onSubmit: (form: DistributionBox) => void;
  submitLabel: string;
}) {
  const toast = useToast();
  const [form, setForm] = useState<DistributionBox>(() => {
    if (initial) return { ...initial };
    return {
      id: genId("box"),
      code: "",
      location: "",
      ratedCapacity: 50,
      lineStatus: LineStatus.NORMAL,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  });

  const submit = () => {
    if (!form.code.trim()) return toast.error("请输入配电箱编号");
    if (!form.location.trim()) return toast.error("请输入位置描述");
    if (form.ratedCapacity <= 0) return toast.error("额定容量需大于 0");
    onSubmit(form);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={14} /> 取消
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            <Save size={14} /> {submitLabel}
          </button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="配电箱编号" required>
          <input
            className="input font-mono"
            placeholder="如 PDX-A03"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="位置描述" required>
          <input
            className="input"
            placeholder="如 东区入口南侧"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <Field label="额定容量 (kW)" required>
          <input
            type="number"
            step={5}
            min={0}
            className="input font-mono"
            value={form.ratedCapacity}
            onChange={(e) =>
              setForm({ ...form, ratedCapacity: parseFloat(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="线路状态">
          <select
            className="select"
            value={form.lineStatus}
            onChange={(e) =>
              setForm({ ...form, lineStatus: e.target.value as LineStatus })
            }
          >
            {Object.entries(LineStatusLabel).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function ApprovalsPanel() {
  const { applications = [], approve, reject, partialApprove } = useApplicationStore();
  const { stalls = [] } = useStallStore();
  const { boxes = [] } = useBoxStore();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ApplicationType>("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const [partialApproveId, setPartialApproveId] = useState<string | null>(null);

  const list = useMemo(() => {
    const l = [...applications].sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );
    let filtered = l;
    if (filter !== "all") filtered = filtered.filter((a) => a.status === filter);
    if (typeFilter !== "all") filtered = filtered.filter((a) => a.applicationType === typeFilter);
    return filtered;
  }, [applications, filter, typeFilter]);

  const getBreakdownForApp = (a: any): CapacityBreakdown | null => {
    const stall = stalls.find((s) => s.id === a.stallId);
    if (!stall) return null;
    const box = boxes.find((b) => b.id === stall.distributionBoxId);
    if (!box) return null;
    return buildCapacityBreakdown(box, stalls, a.peakPower, a.stallId, applications);
  };

  const doApprove = (id: string) => {
    const app = applications.find((a) => a.id === id);
    if (!app) return;
    const breakdown = getBreakdownForApp(app);
    try {
      approve(id, undefined, breakdown || undefined);
      toast.success("已通过申请");
    } catch (e: any) {
      toast.error(e?.message || "审批失败");
    }
  };

  const doReject = (id: string) => {
    const reason = window.prompt("请输入驳回原因：", "申请额度超出剩余容量");
    if (reason === null) return;
    try {
      reject(id, reason || "未说明原因");
      toast.success("已驳回申请");
    } catch (e: any) {
      toast.error(e?.message || "驳回失败");
    }
  };

  const doPartialApprove = (id: string, approvedPower: number, breakdown: CapacityBreakdown, opinion?: string) => {
    try {
      partialApprove(id, approvedPower, breakdown, opinion);
      toast.success(`已部分通过，审批功率 ${formatKW(approvedPower)} kW`);
      setPartialApproveId(null);
    } catch (e: any) {
      toast.error(e?.message || "部分审批失败");
    }
  };

  const viewingApp = applications.find((a) => a.id === viewing);
  const partialApp = applications.find((a) => a.id === partialApproveId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-lg border border-industrial-200 p-1">
            {(
              [
                ["all", "全部状态"],
                [ApplicationStatus.PENDING, "待审批"],
                [ApplicationStatus.APPROVED, "已通过"],
                [ApplicationStatus.PARTIALLY_APPROVED, "部分通过"],
                [ApplicationStatus.REJECTED, "已驳回"],
                [ApplicationStatus.WITHDRAWN, "已撤回"],
                [ApplicationStatus.CONNECTED, "已接电"],
              ] as const
            ).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === k
                    ? "bg-industrial-700 text-white"
                    : "text-industrial-600 hover:bg-industrial-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-lg border border-industrial-200 p-1">
            {(
              [
                ["all", "全部类型"],
                [ApplicationType.STANDARD, "标准"],
                [ApplicationType.TEMPORARY_BOOST, "临时扩容"],
              ] as const
            ).map(([k, v]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTypeFilter(k as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  typeFilter === k
                    ? "bg-industrial-700 text-white"
                    : "text-industrial-600 hover:bg-industrial-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="text-sm text-industrial-500">
          共 <span className="font-mono font-semibold text-industrial-800">{list.length}</span> 条
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto scrollbar-thin -mx-4 -my-2">
          <table className="data-table">
            <thead>
              <tr>
                <th>申请单号</th>
                <th>类型</th>
                <th>摊位</th>
                <th>商户</th>
                <th>峰值功率</th>
                <th>设备数</th>
                <th>食品摊位</th>
                <th>申请时间</th>
                <th>状态</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-industrial-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                list.map((a) => {
                  const stall = stalls.find((s) => s.id === a.stallId);
                  const isTempBoost = a.applicationType === ApplicationType.TEMPORARY_BOOST;
                  const duplicateWarnings = isTempBoost
                    ? checkDuplicateHighPowerDevices(a.stallId, a.devices, applications, stalls)
                    : [];
                  return (
                    <tr key={a.id}>
                      <td className="font-mono text-xs">{a.id.slice(-8)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <ApplicationTypeBadge type={a.applicationType} />
                          {isTempBoost && a.status === ApplicationStatus.PENDING && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                              <TrendingUp size={10} /> 快速审批
                            </span>
                          )}
                          {duplicateWarnings.length > 0 && (
                            <span className="inline-flex items-center" title={duplicateWarnings.join("；")}>
                              <AlertTriangle size={12} className="text-amber-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono font-semibold">{stall?.code || "-"}</td>
                      <td>{a.merchantName}</td>
                      <td className="font-mono text-right">
                        {formatKW(a.peakPower)}
                        {isTempBoost && a.originalPower != null && (
                          <span className="text-[10px] text-industrial-400 ml-1">
                            (原{formatKW(a.originalPower)}+扩{formatKW(a.peakPower - a.originalPower)})
                          </span>
                        )}
                      </td>
                      <td className="text-center">{a.devices.length}</td>
                      <td>{a.isFoodStall || stall?.stallType === StallType.FOOD ? "🍜 是" : "否"}</td>
                      <td className="text-xs text-industrial-500">{formatDateTime(a.createdAt)}</td>
                      <td>
                        <ApplicationStatusBadge status={a.status} />
                      </td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="btn-ghost p-2"
                            onClick={() => setViewing(a.id)}
                            title="查看详情"
                          >
                            <Eye size={14} />
                          </button>
                          {a.status === ApplicationStatus.PENDING && !isTempBoost && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost p-2 hover:!bg-emerald-50 hover:!text-safe-normal"
                                onClick={() => doApprove(a.id)}
                                title="通过"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost p-2 hover:!bg-red-50 hover:!text-safe-danger"
                                onClick={() => doReject(a.id)}
                                title="驳回"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {a.status === ApplicationStatus.PENDING && isTempBoost && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost p-2 hover:!bg-emerald-50 hover:!text-safe-normal"
                                onClick={() => doApprove(a.id)}
                                title="全额通过"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost p-2 hover:!bg-blue-50 hover:!text-blue-600"
                                onClick={() => setPartialApproveId(a.id)}
                                title="部分通过"
                              >
                                <TrendingUp size={14} />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost p-2 hover:!bg-red-50 hover:!text-safe-danger"
                                onClick={() => doReject(a.id)}
                                title="驳回"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingApp && (
        <ApplicationDetailModal
          app={viewingApp}
          stall={stalls.find((s) => s.id === viewingApp.stallId)}
          box={
            boxes.find(
              (b) =>
                b.id ===
                stalls.find((s) => s.id === viewingApp.stallId)?.distributionBoxId
            )
          }
          breakdown={viewingApp.capacityBreakdown || getBreakdownForApp(viewingApp)}
          onClose={() => setViewing(null)}
        />
      )}

      {partialApp && (
        <PartialApproveModal
          app={partialApp}
          stall={stalls.find((s) => s.id === partialApp.stallId)}
          box={
            boxes.find(
              (b) =>
                b.id ===
                stalls.find((s) => s.id === partialApp.stallId)?.distributionBoxId
            )
          }
          breakdown={getBreakdownForApp(partialApp)}
          onConfirm={(approvedPower, breakdown, opinion) =>
            doPartialApprove(partialApp.id, approvedPower, breakdown, opinion)
          }
          onClose={() => setPartialApproveId(null)}
        />
      )}
    </div>
  );
}

function ApplicationDetailModal({
  app,
  stall,
  box,
  breakdown,
  onClose,
}: {
  app: any;
  stall?: Stall;
  box?: DistributionBox;
  breakdown?: CapacityBreakdown | null;
  onClose: () => void;
}) {
  const isTempBoost = app.applicationType === ApplicationType.TEMPORARY_BOOST;

  return (
    <Modal open onClose={onClose} title={`申请详情 ${app.id.slice(-12)}`} size="lg">
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCell label="申请状态">
            <div className="flex items-center gap-1.5">
              <ApplicationStatusBadge status={app.status} />
              <ApplicationTypeBadge type={app.applicationType} />
            </div>
          </InfoCell>
          <InfoCell label="摊位">
            <span className="font-mono font-semibold">{stall?.code || "-"}</span>
          </InfoCell>
          <InfoCell label="配电箱">
            <span className="font-mono">{box?.code || "-"}</span>
          </InfoCell>
          <InfoCell label="申请峰值">
            <span className="font-mono font-semibold text-industrial-800">
              {formatKW(app.peakPower)}
            </span>
          </InfoCell>
        </div>

        {isTempBoost && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">临时扩容功率对比</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-xs text-amber-600 mb-1">原功率</div>
                <div className="font-mono font-bold text-industrial-800">
                  {formatKW(app.originalPower || 0)} kW
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-600 mb-1">
                  {app.approvedBoostPower != null ? "审批通过扩容" : "申请扩容"}
                </div>
                <div className="font-mono font-bold text-amber-700">
                  +{formatKW(app.approvedBoostPower != null ? app.approvedBoostPower : app.peakPower - (app.originalPower || 0))} kW
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-amber-600 mb-1">峰值合计</div>
                <div className="font-mono font-bold text-industrial-800">
                  {formatKW(app.approvedBoostPower != null ? (app.originalPower || 0) + app.approvedBoostPower : app.peakPower)} kW
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <InfoCell label="商户名称">{app.merchantName}</InfoCell>
          <InfoCell label="是否食品摊位">
            {app.isFoodStall || stall?.stallType === StallType.FOOD ? "是" : "否"}
          </InfoCell>
          <InfoCell label="联系电话">{app.contactPhone || "-"}</InfoCell>
          <InfoCell label="食品资质编号">
            {app.foodLicenseNo || "-"}
          </InfoCell>
          <InfoCell label="申请时间">{formatDateTime(app.createdAt)}</InfoCell>
          <InfoCell label="更新时间">{formatDateTime(app.updatedAt)}</InfoCell>
        </div>
        <div>
          <div className="mb-2 label">备注说明</div>
          <p className="text-sm text-industrial-700 bg-industrial-50 p-3 rounded-lg min-h-[48px]">
            {app.notes || "无"}
          </p>
        </div>
        <div>
          <div className="mb-2 label">设备清单（{app.devices.length} 项）</div>
          <div className="border border-industrial-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-industrial-50 text-xs uppercase text-industrial-600">
                <tr>
                  <th className="px-4 py-2 text-left">设备名称</th>
                  <th className="px-4 py-2 text-right">数量</th>
                  <th className="px-4 py-2 text-right">单台功率</th>
                  <th className="px-4 py-2 text-right">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-50">
                {app.devices.map((d: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{d.deviceName}</td>
                    <td className="px-4 py-2 text-right font-mono">{d.quantity}</td>
                    <td className="px-4 py-2 text-right font-mono">{d.unitPower} kW</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">
                      {((d.quantity || 0) * (d.unitPower || 0)).toFixed(2)} kW
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {breakdown && <CapacityBreakdownPanel breakdown={breakdown} />}
        {(app.rejectReason || app.approveRemark || app.approvalOpinion) && (
          <div className="grid md:grid-cols-2 gap-4">
            {(app.approveRemark || app.approvalOpinion) && (
              <InfoCell label="审批备注">{app.approveRemark || app.approvalOpinion}</InfoCell>
            )}
            {app.rejectReason && (
              <InfoCell label="驳回原因">
                <span className="text-safe-danger">{app.rejectReason}</span>
              </InfoCell>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function PartialApproveModal({
  app,
  stall,
  box,
  breakdown,
  onConfirm,
  onClose,
}: {
  app: any;
  stall?: Stall;
  box?: DistributionBox;
  breakdown: CapacityBreakdown | null;
  onConfirm: (approvedPower: number, breakdown: CapacityBreakdown, opinion?: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const maxApprovable = breakdown?.maxApprovable ?? app.peakPower;
  const [approvedPower, setApprovedPower] = useState<number>(maxApprovable);
  const [opinion, setOpinion] = useState("");

  const isTempBoost = app.applicationType === ApplicationType.TEMPORARY_BOOST;
  const originalPower = app.originalPower || 0;
  const totalPower = isTempBoost ? originalPower + approvedPower : approvedPower;

  const canSubmit = approvedPower > 0 && approvedPower <= maxApprovable;

  const handleSubmit = () => {
    if (!canSubmit) {
      toast.error("审批功率需大于 0 且不超过最大可审批功率");
      return;
    }
    if (!breakdown) {
      toast.error("无法获取容量分析数据");
      return;
    }
    onConfirm(approvedPower, breakdown, opinion || undefined);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`部分审批 - ${app.id.slice(-8)}`}
      size="lg"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={14} /> 取消
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            <Check size={14} /> 确认部分通过
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoCell label="申请状态">
            <div className="flex items-center gap-1.5">
              <ApplicationStatusBadge status={app.status} />
              <ApplicationTypeBadge type={app.applicationType} />
            </div>
          </InfoCell>
          <InfoCell label="摊位">
            <span className="font-mono font-semibold">{stall?.code || "-"}</span>
          </InfoCell>
          <InfoCell label="配电箱">
            <span className="font-mono">{box?.code || "-"}</span>
          </InfoCell>
          <InfoCell label="商户">
            <span>{app.merchantName}</span>
          </InfoCell>
        </div>

        {breakdown && <CapacityBreakdownPanel breakdown={breakdown} />}

        <div className="p-4 rounded-lg bg-industrial-50 border border-industrial-200 space-y-3">
          <div className="text-sm font-semibold text-industrial-800">审批功率设置</div>
          <div>
            <label className="label">审批通过功率 (kW)</label>
            <input
              type="number"
              step={0.5}
              min={0}
              max={maxApprovable}
              className="input font-mono"
              value={approvedPower}
              onChange={(e) => setApprovedPower(parseFloat(e.target.value) || 0)}
            />
            <p className="mt-1 text-[11px] text-industrial-400">
              最大可审批：{formatKW(maxApprovable)} kW（输入 0 ~ {formatKW(maxApprovable)} 之间的值）
            </p>
          </div>

          {isTempBoost ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-sm text-amber-800">
                原功率 <span className="font-mono font-bold">{formatKW(originalPower)}</span> kW + 审批通过{" "}
                <span className="font-mono font-bold text-amber-700">{formatKW(approvedPower)}</span> kW = 总计{" "}
                <span className="font-mono font-bold text-industrial-800">{formatKW(totalPower)}</span> kW
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-sm text-blue-800">
                审批通过功率：<span className="font-mono font-bold">{formatKW(approvedPower)}</span> kW
              </div>
            </div>
          )}

          <div>
            <label className="label">审批意见</label>
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="请输入审批意见（选填）"
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className={required ? "label label-required" : "label"}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-industrial-400">{hint}</p>}
    </div>
  );
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-industrial-500 font-medium mb-1">{label}</div>
      <div className="text-sm text-industrial-800">{children}</div>
    </div>
  );
}
