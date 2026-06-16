import {
  DistributionBox,
  Stall,
  ElectricityApplication,
  DeviceItem,
  ConnectionRecord,
} from "@/types";
import {
  ApplicationStatus,
  LineStatus,
  StallStatus,
  StallType,
} from "@/types/enums";
import { calcBoxRemainingCapacity } from "./capacity";

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export function validateSubmitApplication(
  app: Partial<ElectricityApplication>,
  devices: DeviceItem[],
  stall: Stall | undefined,
  box: DistributionBox | undefined,
  allStalls: Stall[]
): ValidationResult {
  if (!stall) {
    return { valid: false, message: "请选择摊位" };
  }
  if (stall.status !== StallStatus.IDLE) {
    return { valid: false, message: "该摊位当前不可申请，请选择其他摊位" };
  }
  if (stall.locked) {
    return { valid: false, message: "该摊位已锁定，不可申请" };
  }
  if (!app.merchantName?.trim()) {
    return { valid: false, message: "请填写商户名称" };
  }
  if (!app.contactInfo?.trim()) {
    return { valid: false, message: "请填写联系方式" };
  }
  if (app.peakPower === undefined || app.peakPower === null || app.peakPower <= 0) {
    return { valid: false, message: "请填写有效的峰值功率" };
  }
  if (stall.stallType === StallType.FOOD || app.isFoodStall) {
    if (!devices || devices.length === 0) {
      return { valid: false, message: "食品摊位请填写设备清单后再提交" };
    }
    if (!app.foodLicenseNo?.trim()) {
      return { valid: false, message: "食品摊位请填写食品经营许可证编号" };
    }
  }
  const deviceTotal = (devices || []).reduce((s, d) => s + (d.totalPower || 0), 0);
  if (devices && devices.length > 0 && deviceTotal > (app.peakPower || 0)) {
    return {
      valid: false,
      message: `设备总功率(${deviceTotal.toFixed(2)}kW)不能超过峰值功率`,
    };
  }
  if (box) {
    const remaining = calcBoxRemainingCapacity(box, allStalls);
    if (app.peakPower! > remaining) {
      return {
        valid: false,
        message: `申请额度超过剩余容量(剩余${remaining.toFixed(2)}kW)，请调整功率或联系运营`,
      };
    }
  }
  if (!app.activityPeriod?.trim()) {
    return { valid: false, message: "请填写活动时段说明" };
  }
  return { valid: true };
}

export function validateWithdrawApplication(app: ElectricityApplication): ValidationResult {
  if (app.status !== ApplicationStatus.PENDING) {
    return { valid: false, message: "当前状态不可撤回申请" };
  }
  return { valid: true };
}

export function validateConnection(
  app: ElectricityApplication,
  stall: Stall | undefined,
  box: DistributionBox | undefined,
  allStalls: Stall[],
  safetyPassed: boolean
): ValidationResult {
  if (!stall) return { valid: false, message: "摊位不存在" };
  if (!box) return { valid: false, message: "配电箱不存在" };
  if (app.status !== ApplicationStatus.APPROVED) {
    return { valid: false, message: "申请未通过审批，无法接电" };
  }
  if (box.lineStatus !== LineStatus.NORMAL) {
    return { valid: false, message: "线路状态异常，请先处理线路问题" };
  }
  const remaining = calcBoxRemainingCapacity(box, allStalls);
  if (app.peakPower > remaining) {
    return {
      valid: false,
      message: `剩余容量(${remaining.toFixed(2)}kW)不足，无法接电`,
    };
  }
  if (!safetyPassed) {
    return { valid: false, message: "安全检查未通过，无法接电" };
  }
  return { valid: true };
}

export function validateStallLock(stall: Stall, action: string): ValidationResult {
  if (stall.locked) {
    return { valid: false, message: `该摊位已完成接电，不可${action}` };
  }
  return { valid: true };
}

export function validateSuspend(stall: Stall): ValidationResult {
  if (stall.status !== StallStatus.CONNECTED) {
    return { valid: false, message: "仅已接电摊位可执行暂停操作" };
  }
  return { valid: true };
}

export function validateRestore(stall: Stall): ValidationResult {
  if (stall.status !== StallStatus.SUSPENDED) {
    return { valid: false, message: "仅暂停状态摊位可执行恢复操作" };
  }
  return { valid: true };
}

export function validateDeviceItem(item: Partial<DeviceItem>): ValidationResult {
  if (!item.deviceName?.trim()) {
    return { valid: false, message: "请填写设备名称" };
  }
  if (!item.quantity || item.quantity <= 0) {
    return { valid: false, message: "请填写有效数量" };
  }
  if (item.unitPower === undefined || item.unitPower < 0) {
    return { valid: false, message: "请填写有效单台功率" };
  }
  return { valid: true };
}
