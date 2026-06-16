import React from "react";
import { CapacityBreakdown, CapacityBreakdownItem } from "@/types";
import { formatKW } from "@/utils/capacity";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

export function getBreakdownItemColor(
  type: CapacityBreakdownItem["type"]
): string {
  switch (type) {
    case "existing":
      return "bg-blue-500";
    case "adjacent_shared":
      return "bg-amber-500";
    case "reserved":
      return "bg-purple-500";
    case "requested":
      return "bg-emerald-500";
    case "available":
      return "bg-gray-300";
  }
}

const TYPE_LABEL: Record<CapacityBreakdownItem["type"], string> = {
  existing: "已有占用",
  adjacent_shared: "相邻共用",
  reserved: "预留占用",
  requested: "本次申请",
  available: "剩余可用",
};

interface Props {
  breakdown: CapacityBreakdown;
}

export default function CapacityBreakdownPanel({ breakdown }: Props) {
  const { boxRated, items, totalUsed, remainingAfterApproval, canFullyApprove, maxApprovable, adjacentSharedCircuit, duplicateDeviceWarnings } = breakdown;

  const barItems = items.filter((it) => it.power > 0 && it.type !== "available");
  const availableItem = items.find((it) => it.type === "available");

  const usedInBar = barItems.reduce((s, it) => s + it.power, 0);

  return (
    <div className="card p-5 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-industrial-800 mb-1">
          容量占用明细
        </h4>
        <p className="text-xs text-industrial-500">
          配电箱额定 {formatKW(boxRated)}kW | 已占用 {formatKW(totalUsed)}kW | 审批后剩余 {formatKW(remainingAfterApproval)}kW
        </p>
      </div>

      <div>
        <div className="w-full h-7 rounded-md overflow-hidden flex bg-gray-100">
          {barItems.map((it, i) => {
            const pct = boxRated > 0 ? (it.power / boxRated) * 100 : 0;
            if (pct < 0.3) return null;
            return (
              <div
                key={`${it.type}-${i}`}
                className={`${getBreakdownItemColor(it.type)} h-full transition-all duration-500 ${
                  it.type === "requested" ? "opacity-80" : ""
                }`}
                style={{ width: `${pct}%` }}
                title={`${it.label}: ${formatKW(it.power)}kW`}
              />
            );
          })}
          {availableItem && availableItem.power > 0 && (
            <div
              className="bg-gray-200 h-full"
              style={{
                width: `${boxRated > 0 ? (availableItem.power / boxRated) * 100 : 0}%`,
              }}
              title={`剩余可用: ${formatKW(availableItem.power)}kW`}
            />
          )}
        </div>

        <div className="flex justify-between mt-1.5 text-[10px] text-industrial-400 font-mono">
          <span>0 kW</span>
          <span>{formatKW(boxRated)} kW</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {(Object.keys(TYPE_LABEL) as CapacityBreakdownItem["type"][]).map(
          (type) => (
            <div key={type} className="flex items-center gap-1.5 text-xs text-industrial-600">
              <span
                className={`inline-block w-3 h-3 rounded-sm ${getBreakdownItemColor(type)}`}
              />
              {TYPE_LABEL[type]}
            </div>
          )
        )}
      </div>

      <ul className="space-y-2">
        {items.map((it, i) => (
          <li
            key={`${it.type}-${i}`}
            className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-industrial-50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`shrink-0 w-2.5 h-2.5 rounded-sm ${getBreakdownItemColor(it.type)}`}
              />
              <span className="text-industrial-700 truncate">{it.label}</span>
            </div>
            <span className="shrink-0 font-mono font-medium text-industrial-800 ml-3">
              {formatKW(it.power)} kW
            </span>
          </li>
        ))}
      </ul>

      {!canFullyApprove && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-safe-warning" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-medium mb-0.5">无法全额审批</p>
            <p>
              本次申请超出剩余容量，最大可审批{" "}
              <span className="font-mono font-semibold">{formatKW(maxApprovable)} kW</span>
              ，需减少申请功率或等待容量释放。
            </p>
          </div>
        </div>
      )}

      {adjacentSharedCircuit && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-medium mb-0.5">相邻摊位共用线路</p>
            <p>{adjacentSharedCircuit}</p>
          </div>
        </div>
      )}

      {duplicateDeviceWarnings && duplicateDeviceWarnings.length > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-safe-danger" />
          <div className="text-xs text-red-800 leading-relaxed">
            <p className="font-medium mb-0.5">重复设备警告</p>
            <ul className="list-disc list-inside space-y-0.5">
              {duplicateDeviceWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
