export enum UserRole {
  OPERATION = "operation",
  MERCHANT = "merchant",
  ELECTRICIAN = "electrician",
  INSPECTOR = "inspector",
}

export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.OPERATION]: "运营管理员",
  [UserRole.MERCHANT]: "商户",
  [UserRole.ELECTRICIAN]: "电工",
  [UserRole.INSPECTOR]: "安全巡检员",
};

export enum StallStatus {
  IDLE = "idle",
  APPLYING = "applying",
  CONNECTED = "connected",
  SUSPENDED = "suspended",
  ABNORMAL = "abnormal",
  LIMITED = "limited",
}

export const StallStatusLabel: Record<StallStatus, string> = {
  [StallStatus.IDLE]: "空闲",
  [StallStatus.APPLYING]: "申请中",
  [StallStatus.CONNECTED]: "已接电",
  [StallStatus.SUSPENDED]: "已暂停",
  [StallStatus.ABNORMAL]: "异常",
  [StallStatus.LIMITED]: "限电待整改",
};

export enum ApplicationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
  CONNECTED = "connected",
  PARTIALLY_APPROVED = "partially_approved",
}

export const ApplicationStatusLabel: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: "待审批",
  [ApplicationStatus.APPROVED]: "已通过",
  [ApplicationStatus.REJECTED]: "已驳回",
  [ApplicationStatus.WITHDRAWN]: "已撤回",
  [ApplicationStatus.CONNECTED]: "已接电",
  [ApplicationStatus.PARTIALLY_APPROVED]: "部分通过",
};

export enum ApplicationType {
  STANDARD = "standard",
  TEMPORARY_BOOST = "temporary_boost",
}

export const ApplicationTypeLabel: Record<ApplicationType, string> = {
  [ApplicationType.STANDARD]: "标准申请",
  [ApplicationType.TEMPORARY_BOOST]: "临时扩容",
};

export enum StallType {
  NORMAL = "normal",
  FOOD = "food",
}

export const StallTypeLabel: Record<StallType, string> = {
  [StallType.NORMAL]: "普通摊位",
  [StallType.FOOD]: "食品摊位",
};

export enum LineStatus {
  NORMAL = "normal",
  ABNORMAL = "abnormal",
  MAINTENANCE = "maintenance",
}

export const LineStatusLabel: Record<LineStatus, string> = {
  [LineStatus.NORMAL]: "线路正常",
  [LineStatus.ABNORMAL]: "线路异常",
  [LineStatus.MAINTENANCE]: "维护中",
};

export enum InspectionResult {
  NORMAL = "normal",
  ABNORMAL = "abnormal",
}

export const InspectionResultLabel: Record<InspectionResult, string> = {
  [InspectionResult.NORMAL]: "正常",
  [InspectionResult.ABNORMAL]: "异常",
};

export enum SuspensionStatus {
  SUSPENDED = "suspended",
  RESTORED = "restored",
}

export const SuspensionStatusLabel: Record<SuspensionStatus, string> = {
  [SuspensionStatus.SUSPENDED]: "已暂停",
  [SuspensionStatus.RESTORED]: "已恢复",
};

export enum WarningLevel {
  INFO = "info",
  WARNING = "warning",
  DANGER = "danger",
}

export const WarningLevelLabel: Record<WarningLevel, string> = {
  [WarningLevel.INFO]: "提示",
  [WarningLevel.WARNING]: "高负载",
  [WarningLevel.DANGER]: "超载",
};

export const HIGH_LOAD_THRESHOLD = 0.75;
export const OVERLOAD_THRESHOLD = 0.9;
