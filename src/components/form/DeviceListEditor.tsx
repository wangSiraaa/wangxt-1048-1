import React from "react";
import { DeviceItem } from "@/types";
import { Plus, Trash2, Calculator } from "lucide-react";
import { genId } from "@/utils/id";
import { validateDeviceItem } from "@/utils/validation";
import { useToast } from "@/components/common/Toast";

export interface DeviceRow
  extends Omit<DeviceItem, "id" | "applicationId" | "totalPower"> {
  totalPower: number;
}

interface Props {
  value: DeviceRow[];
  onChange: (rows: DeviceRow[]) => void;
  required?: boolean;
  disabled?: boolean;
}

export function createEmptyRow(): DeviceRow {
  return { deviceName: "", quantity: 1, unitPower: 0, totalPower: 0 };
}

export default function DeviceListEditor({ value, onChange, required, disabled }: Props) {
  const toast = useToast();

  const updateRow = (idx: number, patch: Partial<DeviceRow>) => {
    if (disabled) return;
    const next = value.map((r, i) => {
      if (i !== idx) return r;
      const merged = { ...r, ...patch };
      const q = Number(merged.quantity) || 0;
      const u = Number(merged.unitPower) || 0;
      merged.totalPower = +(q * u).toFixed(2);
      return merged;
    });
    onChange(next);
  };

  const addRow = () => {
    if (disabled) return;
    onChange([...value, createEmptyRow()]);
  };

  const removeRow = (idx: number) => {
    if (disabled) return;
    if (value.length === 1) {
      onChange([createEmptyRow()]);
    } else {
      onChange(value.filter((_, i) => i !== idx));
    }
  };

  const total = value.reduce((s, r) => s + (r.totalPower || 0), 0);
  const hasEmpty = value.some(
    (r) => !r.deviceName?.trim() || r.quantity <= 0 || r.unitPower < 0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={`label ${required ? "label-required" : ""} mb-0`}>
          设备清单
        </label>
        <div className="flex items-center gap-3 text-xs">
          {required && value.filter((r) => r.deviceName?.trim()).length === 0 && (
            <span className="text-safe-danger font-medium">请至少填写1条设备</span>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-industrial-50 border border-industrial-100">
            <Calculator size={12} className="text-industrial-500" />
            <span className="text-industrial-600">设备总功率</span>
            <span className="font-mono font-semibold text-industrial-800">
              {total.toFixed(2)} kW
            </span>
          </div>
        </div>
      </div>

      <div className="border border-industrial-200 rounded-lg overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_90px_110px_110px_40px] bg-industrial-50 text-xs font-semibold text-industrial-600 uppercase tracking-wider">
          <div className="px-4 py-2.5">设备名称</div>
          <div className="px-3 py-2.5 text-right">数量</div>
          <div className="px-3 py-2.5 text-right">单台功率 (kW)</div>
          <div className="px-3 py-2.5 text-right">小计 (kW)</div>
          <div className="px-2 py-2.5"></div>
        </div>
        <div className="divide-y divide-industrial-50 max-h-56 overflow-y-auto scrollbar-thin">
          {value.map((row, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 md:grid-cols-[1fr_90px_110px_110px_40px] gap-2 md:gap-0 items-center px-3 py-2 hover:bg-industrial-50/60"
            >
              <div className="md:px-1">
                <span className="md:hidden text-[11px] text-industrial-500 mr-2">名称</span>
                <input
                  className="input py-1.5"
                  placeholder="如：制冰机"
                  value={row.deviceName}
                  onChange={(e) => updateRow(idx, { deviceName: e.target.value })}
                  disabled={disabled}
                />
              </div>
              <div className="md:px-2 md:text-right">
                <span className="md:hidden text-[11px] text-industrial-500 mr-2">数量</span>
                <input
                  type="number"
                  min={1}
                  className="input py-1.5 text-right"
                  value={row.quantity}
                  onChange={(e) => updateRow(idx, { quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="md:px-2 md:text-right">
                <span className="md:hidden text-[11px] text-industrial-500 mr-2">单台</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  className="input py-1.5 text-right font-mono"
                  value={row.unitPower}
                  onChange={(e) => updateRow(idx, { unitPower: parseFloat(e.target.value) || 0 })}
                  disabled={disabled}
                />
              </div>
              <div className="md:px-2 md:text-right">
                <span className="md:hidden text-[11px] text-industrial-500 mr-2">小计</span>
                <div className="py-1.5 font-mono font-semibold text-industrial-800 bg-industrial-50/80 rounded text-right px-3">
                  {row.totalPower.toFixed(2)}
                </div>
              </div>
              <div className="md:px-0 md:text-right col-span-2 md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="p-1.5 rounded text-industrial-400 hover:text-safe-danger hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="删除此行"
                  disabled={disabled}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addRow}
        className={`mt-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${disabled ? "text-industrial-300 cursor-not-allowed" : "text-industrial-600 hover:text-industrial-800"}`}
        disabled={disabled}
      >
        <Plus size={14} /> 添加设备
      </button>
    </div>
  );
}
