import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  Plus,
  Send,
  Undo2,
  Eye,
  X,
  Save,
  Lock,
  FileWarning,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useStallStore } from "@/store/useStallStore";
import { useBoxStore } from "@/store/useBoxStore";
import { useApplicationStore } from "@/store/useApplicationStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/components/common/Toast";
import Modal from "@/components/common/Modal";
import StallGrid from "@/components/stall/StallGrid";
import {
  ApplicationStatusBadge,
  StallStatusBadge,
  StallTypeBadge,
} from "@/components/common/StatusBadge";
import {
  UserRole,
  StallType,
  StallStatus,
  ApplicationStatus,
} from "@/types/enums";
import { Stall, ElectricityApplication, DeviceItem } from "@/types";
import { formatKW, calcBoxRemainingCapacity } from "@/utils/capacity";
import { formatDateTime } from "@/utils/time";
import DeviceListEditor, {
  DeviceRow,
  createEmptyRow,
} from "@/components/form/DeviceListEditor";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

type TabKey = "apply" | "myapps";

export default function MerchantApplication() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  const noPermit =
    currentRole !== UserRole.MERCHANT && currentRole !== UserRole.OPERATION;
  if (noPermit) {
    return (
      <div className="card p-12 text-center">
        <Lock className="mx-auto text-industrial-300 mb-3" size={48} />
        <h3 className="text-lg font-semibold text-industrial-800 mb-2">
          无权限访问
        </h3>
        <p className="text-sm text-industrial-500">
          该页面仅【商户】与【运营】可访问，请切换角色。
        </p>
      </div>
    );
  }
  return <MerchantInner />;
}

function MerchantInner() {
  const [tab, setTab] = useState<TabKey>("apply");
  const { currentUserName = "系统用户" } = useAuthStore();
  const { applications = [], submit, withdraw } = useApplicationStore();
  const { stalls = [] } = useStallStore();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [draftStall, setDraftStall] = useState<Stall | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const myApps = useMemo(
    () =>
      [...applications]
        .filter((a) => a.merchantName === currentUserName)
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))),
    [applications, currentUserName]
  );

  const openApplyFor = (stall: Stall) => {
    if (stall.status !== StallStatus.IDLE) {
      toast.warning("该摊位当前不可申请");
      return;
    }
    if (stall.locked) {
      toast.warning("该摊位已锁定");
      return;
    }
    setDraftStall(stall);
    setFormOpen(true);
  };

  const doWithdraw = (id: string) => {
    if (!confirm("确定要撤回该申请吗？")) return;
    try {
      withdraw(id);
      toast.success("已撤回申请");
    } catch (e: any) {
      toast.error(e?.message || "撤回失败");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-safe-normal flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-industrial-800">
              商户用电申请
            </h2>
            <p className="text-xs text-industrial-500 mt-0.5">
              当前身份：{currentUserName} · 提交申请后等待运营审批
            </p>
          </div>
        </div>
        <div className="tabs">
          <button
            type="button"
            onClick={() => setTab("apply")}
            className={tab === "apply" ? "tab-active" : "tab-inactive"}
          >
            <Plus size={16} />
            提交新申请
          </button>
          <button
            type="button"
            onClick={() => setTab("myapps")}
            className={tab === "myapps" ? "tab-active" : "tab-inactive"}
          >
            <ClipboardList size={16} />
            我的申请 ({myApps.length})
          </button>
        </div>
      </div>

      {tab === "apply" && (
        <ApplyPanel
          onApply={openApplyFor}
          draftStall={draftStall}
          formOpen={formOpen}
          setFormOpen={setFormOpen}
          setDraftStall={setDraftStall}
        />
      )}

      {tab === "myapps" && (
        <div className="space-y-4">
          {myApps.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-industrial-50 flex items-center justify-center mx-auto mb-3">
                <ClipboardList size={26} className="text-industrial-400" />
              </div>
              <p className="text-sm text-industrial-500">您还未提交过申请</p>
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setTab("apply")}
              >
                <Plus size={14} /> 去申请
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myApps.map((app) => {
                const stall = stalls.find((s) => s.id === app.stallId);
                const canWithdraw =
                  app.status === ApplicationStatus.PENDING ||
                  app.status === ApplicationStatus.APPROVED;
                return (
                  <div key={app.id} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-industrial-50 flex items-center justify-center shrink-0">
                          <FileWarning size={22} className="text-industrial-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <ApplicationStatusBadge status={app.status} />
                            <span className="font-mono font-semibold text-industrial-800 text-sm">
                              摊位 {stall?.code || "-"}
                            </span>
                            <StallTypeBadge type={stall?.stallType || StallType.NORMAL} />
                          </div>
                          <p className="text-xs text-industrial-500 mb-2">
                            申请单号：
                            <span className="font-mono">{app.id.slice(-12)}</span>
                            {" · "}提交时间：{formatDateTime(app.createdAt)}
                          </p>
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="text-industrial-400 mb-0.5">峰值功率</div>
                              <div className="font-mono font-semibold text-industrial-800">
                                {formatKW(app.peakPower)}
                              </div>
                            </div>
                            <div>
                              <div className="text-industrial-400 mb-0.5">设备数量</div>
                              <div className="font-mono font-semibold text-industrial-800">
                                {app.devices.length} 台
                              </div>
                            </div>
                            <div>
                              <div className="text-industrial-400 mb-0.5">食品摊位</div>
                              <div className="font-semibold text-industrial-800">
                                {app.isFoodStall ? "是" : "否"}
                              </div>
                            </div>
                          </div>
                          {app.rejectReason && (
                            <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-100 text-xs text-safe-danger flex items-start gap-1.5">
                              <AlertCircle size={12} className="mt-0.5 shrink-0" />
                              <div>
                                <div className="font-medium mb-0.5">驳回原因：</div>
                                {app.rejectReason}
                              </div>
                            </div>
                          )}
                          {stall?.locked && app.status === ApplicationStatus.CONNECTED && (
                            <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-safe-normal flex items-start gap-1.5">
                              <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
                              已完成接电，摊位已锁定
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setViewingId(app.id)}
                        >
                          <Eye size={14} /> 详情
                        </button>
                        {canWithdraw && (
                          <button
                            type="button"
                            className="btn-warning"
                            onClick={() => doWithdraw(app.id)}
                          >
                            <Undo2 size={14} /> 撤回申请
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {formOpen && draftStall && (
        <ApplyFormModal
          stall={draftStall}
          onClose={() => setFormOpen(false)}
          onSubmit={(payload) => {
            try {
              const { devices: devs, ...rest } = payload;
              submit(
                { ...rest, stallId: draftStall.id, contactInfo: payload.contactPhone, activityPeriod: payload.notes || "" },
                devs.map((d) => ({ deviceName: d.deviceName, quantity: d.quantity, unitPower: d.unitPower }))
              );
              toast.success("申请已提交，等待审批");
              setFormOpen(false);
              setDraftStall(null);
              setTab("myapps");
            } catch (e: any) {
              toast.error(e?.message || "提交失败");
            }
          }}
        />
      )}

      {viewingId && (
        <ViewAppModal
          app={applications.find((a) => a.id === viewingId)!}
          stall={stalls.find(
            (s) => s.id === applications.find((a) => a.id === viewingId)?.stallId
          )}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}

function ApplyPanel({
  onApply,
}: {
  onApply: (stall: Stall) => void;
  draftStall: Stall | null;
  formOpen: boolean;
  setFormOpen: (b: boolean) => void;
  setDraftStall: (s: Stall | null) => void;
}) {
  const { stalls = [] } = useStallStore();
  const { boxes = [] } = useBoxStore();
  const idleStalls = stalls.filter((s) => s.status === StallStatus.IDLE && !s.locked);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <InfoTipCard
          icon={<Info size={18} />}
          color="blue"
          title="提交步骤"
          desc="点击下方空闲摊位 → 填写设备清单与信息 → 提交等待审批"
        />
        <InfoTipCard
          icon={<AlertCircle size={18} />}
          color="amber"
          title="食品摊位注意"
          desc="必须填写完整的设备清单和食品经营资质编号"
        />
        <InfoTipCard
          icon={<Lock size={18} />}
          color="emerald"
          title="容量校验"
          desc="提交前会自动校验剩余容量，超出将自动拒绝"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="font-semibold text-industrial-800">选择空闲摊位</h3>
            <p className="text-xs text-industrial-500 mt-0.5">
              当前共 <span className="font-mono font-semibold">{idleStalls.length}</span> 个摊位可申请，
              点击摊位卡片开始申请
            </p>
          </div>
        </div>
        <StallGrid boxes={boxes} stalls={stalls} onSelectStall={onApply} />
      </div>
    </div>
  );
}

function InfoTipCard({
  icon,
  color,
  title,
  desc,
}: {
  icon: React.ReactNode;
  color: "blue" | "amber" | "emerald";
  title: string;
  desc: string;
}) {
  const map = {
    blue: "bg-blue-50 border-blue-100 text-blue-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
  } as const;
  return (
    <div className={`card p-4 flex items-start gap-3 border ${map[color]}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm mb-1">{title}</p>
        <p className="text-xs opacity-90 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

interface ApplyPayload {
  merchantName: string;
  contactPhone: string;
  isFoodStall: boolean;
  foodLicenseNo: string;
  peakPower: number;
  devices: DeviceItem[];
  notes: string;
}

function ApplyFormModal({
  stall,
  onClose,
  onSubmit,
}: {
  stall: Stall;
  onClose: () => void;
  onSubmit: (payload: ApplyPayload) => void;
}) {
  const toast = useToast();
  const { boxes = [] } = useBoxStore();
  const { stalls = [] } = useStallStore();
  const { currentUserName = "系统用户" } = useAuthStore();
  const box = boxes.find((b) => b.id === stall.distributionBoxId);
  const remaining = box ? calcBoxRemainingCapacity(box, stalls) : 0;

  const isFoodForce = stall.stallType === StallType.FOOD;

  const [merchantName, setMerchantName] = useState(currentUserName);
  const [contactPhone, setContactPhone] = useState("");
  const [isFoodStall, setIsFoodStall] = useState(isFoodForce);
  const [foodLicenseNo, setFoodLicenseNo] = useState("");
  const [devices, setDevices] = useState<DeviceRow[]>([createEmptyRow()]);
  const [notes, setNotes] = useState("");

  const peak = devices.reduce((s, r) => s + (r.totalPower || 0), 0);
  const exceed = box ? peak > remaining + 0.0001 : false;

  const submit = () => {
    if (!merchantName.trim()) return toast.error("请填写商户名称");
    if (!contactPhone.trim()) return toast.error("请填写联系电话");
    const validDevices = devices.filter(
      (d) => d.deviceName.trim() && d.quantity > 0 && d.unitPower >= 0
    );
    const isFood = isFoodForce || isFoodStall;
    if (isFood && validDevices.length === 0) {
      return toast.error("食品摊位必须填写至少一项设备清单");
    }
    if (isFood && !foodLicenseNo.trim()) {
      return toast.error("食品摊位必须填写食品经营资质编号");
    }
    if (exceed) {
      return toast.error(
        `申请额度（${peak.toFixed(2)} kW）超出剩余容量（${remaining.toFixed(2)} kW），请减少设备`
      );
    }

    const finalDevices: DeviceItem[] = validDevices.map((d) => ({
      id: genId("dev"),
      applicationId: "",
      deviceName: d.deviceName.trim(),
      quantity: d.quantity,
      unitPower: d.unitPower,
    }));

    onSubmit({
      merchantName: merchantName.trim(),
      contactPhone: contactPhone.trim(),
      isFoodStall: isFood,
      foodLicenseNo: foodLicenseNo.trim(),
      peakPower: +peak.toFixed(2),
      devices: finalDevices,
      notes: notes.trim(),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`申请 ${stall.code} 用电`}
      size="xl"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            <X size={14} /> 取消
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={exceed}
          >
            <Send size={14} /> 提交申请
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-gradient-to-r from-industrial-50 to-white border border-industrial-100">
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <Field label="摊位编号">
              <div className="font-mono font-semibold">{stall.code}</div>
            </Field>
            <Field label="摊位名称">
              <div className="font-medium text-industrial-800">{stall.name}</div>
            </Field>
            <Field label="所属配电箱">
              <div className="font-mono">{box?.code || "-"}</div>
            </Field>
            <Field label="剩余容量">
              <div
                className={`font-mono font-semibold ${
                  remaining < 5 ? "text-safe-danger" : "text-safe-normal"
                }`}
              >
                {formatKW(remaining)}
              </div>
            </Field>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="商户名称" required>
            <input
              className="input"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="如：张三小吃店"
            />
          </Field>
          <Field label="联系电话" required>
            <input
              className="input font-mono"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="如：138****8888"
            />
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Field label="是否为食品摊位">
            <label className="flex items-center gap-2 cursor-pointer h-[42px]">
              <input
                type="checkbox"
                checked={isFoodStall}
                disabled={isFoodForce}
                onChange={(e) => setIsFoodStall(e.target.checked)}
                className="w-4 h-4 rounded text-industrial-700 focus:ring-industrial-500"
              />
              <span className="text-sm text-industrial-700">
                是（{isFoodForce ? "摊位类型为食品，强制勾选" : "如售卖现制食品请勾选"}）
              </span>
            </label>
          </Field>
          {isFoodStall && (
            <Field label="食品经营资质编号" required>
              <input
                className="input font-mono"
                value={foodLicenseNo}
                onChange={(e) => setFoodLicenseNo(e.target.value)}
                placeholder="如 JY14400000000000"
              />
            </Field>
          )}
        </div>

        <DeviceListEditor
          value={devices}
          onChange={setDevices}
          required={isFoodStall || isFoodForce}
        />

        {exceed && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-safe-danger text-xs flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <div>
              当前峰值功率 {peak.toFixed(2)} kW，超过配电箱剩余容量{" "}
              {remaining.toFixed(2)} kW，请减少设备或申请其他摊位。
            </div>
          </div>
        )}

        <Field label="备注说明">
          <textarea
            className="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="活动说明、用电时段等补充信息"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label className={required ? "label label-required" : "label"}>{label}</label>
      {children}
    </div>
  );
}

function ViewAppModal({
  app,
  stall,
  onClose,
}: {
  app: ElectricityApplication;
  stall?: Stall;
  onClose: () => void;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={`申请详情 ${app.id.slice(-12)}`}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <ApplicationStatusBadge status={app.status} />
          <span className="font-mono font-semibold">摊位 {stall?.code || "-"}</span>
          <StallStatusBadge status={stall?.status || StallStatus.IDLE} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="商户">
            <div>{app.merchantName}</div>
          </Field>
          <Field label="联系电话">
            <div className="font-mono">{app.contactPhone || "-"}</div>
          </Field>
          <Field label="食品摊位">
            <div>{app.isFoodStall ? "是" : "否"}</div>
          </Field>
          <Field label="资质编号">
            <div className="font-mono">{app.foodLicenseNo || "-"}</div>
          </Field>
          <Field label="峰值功率">
            <div className="font-mono font-semibold">{formatKW(app.peakPower)}</div>
          </Field>
          <Field label="提交时间">
            <div>{formatDateTime(app.createdAt)}</div>
          </Field>
        </div>
        <div>
          <div className="label">设备清单</div>
          <div className="border border-industrial-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-industrial-50 text-xs uppercase text-industrial-600">
                <tr>
                  <th className="px-4 py-2 text-left">设备</th>
                  <th className="px-4 py-2 text-right">数量</th>
                  <th className="px-4 py-2 text-right">单台</th>
                  <th className="px-4 py-2 text-right">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-50">
                {app.devices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-industrial-400">
                      无
                    </td>
                  </tr>
                ) : (
                  app.devices.map((d, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2">{d.deviceName}</td>
                      <td className="px-4 py-2 text-right font-mono">{d.quantity}</td>
                      <td className="px-4 py-2 text-right font-mono">{d.unitPower} kW</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">
                        {(d.quantity * d.unitPower).toFixed(2)} kW
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Field label="备注">
          <div className="p-3 rounded bg-industrial-50 text-industrial-700 min-h-[40px]">
            {app.notes || "无"}
          </div>
        </Field>
        {app.rejectReason && (
          <Field label="驳回原因">
            <div className="p-3 rounded bg-red-50 text-safe-danger border border-red-100">
              {app.rejectReason}
            </div>
          </Field>
        )}
      </div>
    </Modal>
  );
}
