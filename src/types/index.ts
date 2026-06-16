import {
  StallStatus,
  ApplicationStatus,
  StallType,
  LineStatus,
  InspectionResult,
  SuspensionStatus,
  WarningLevel,
} from "./enums";

export interface TemporaryPeriod {
  start: string;
  end: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
}

export interface DistributionBox {
  id: string;
  code: string;
  location: string;
  ratedCapacity: number;
  lineStatus: LineStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Stall {
  id: string;
  code: string;
  name: string;
  distributionBoxId: string;
  ratedCapacity: number;
  occupiedCapacity: number;
  temporaryPeriod?: TemporaryPeriod;
  temporaryPeriods?: TemporaryPeriod[];
  adjacentStallIds?: string[];
  adjacentLimit?: string;
  stallType: StallType;
  status: StallStatus;
  locked: boolean;
  gridRow: number;
  gridCol: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceItem {
  id: string;
  applicationId: string;
  deviceName: string;
  quantity: number;
  unitPower: number;
  totalPower?: number;
}

export interface ElectricityApplication {
  id: string;
  stallId: string;
  merchantName: string;
  contactInfo: string;
  contactPhone?: string;
  isFoodStall: boolean;
  foodLicenseNo?: string;
  peakPower: number;
  activityPeriod: string;
  requirementDesc?: string;
  notes?: string;
  rejectReason?: string;
  status: ApplicationStatus;
  approverId?: string;
  approverName?: string;
  approvalOpinion?: string;
  createdAt: string;
  approvedAt?: string;
  withdrawnAt?: string;
  devices: DeviceItem[];
}

export interface ConnectionRecord {
  id: string;
  applicationId: string;
  stallId: string;
  electricianName: string;
  remainingCapacity: number;
  lineStatusCheck: LineStatus;
  safetyCheckResult: "pass" | "fail";
  signature: string;
  remarks?: string;
  connectedAt: string;
}

export interface InspectionRecord {
  id: string;
  stallId: string;
  inspectorName: string;
  measuredLoad: number;
  measuredPower?: number;
  isOverload: boolean;
  abnormalities: string[];
  hazards?: string[];
  photos?: string;
  inspectionResult: InspectionResult;
  result?: InspectionResult;
  remarks?: string;
  notes?: string;
  inspectedAt: string;
}

export interface SuspensionRecord {
  id: string;
  stallId: string;
  inspectionRecordId?: string;
  reason: string;
  operatorName: string;
  status: SuspensionStatus;
  restoreRemark?: string;
  restorerName?: string;
  suspendedAt: string;
  restoredAt?: string;
}

export interface CapacityWarning {
  id: string;
  boxId: string;
  boxCode: string;
  level: WarningLevel;
  usageRate: number;
  ratedCapacity: number;
  usedCapacity: number;
  message: string;
  createdAt: string;
}

export interface BoxCapacityInfo {
  box: DistributionBox;
  usedCapacity: number;
  remainingCapacity: number;
  usageRate: number;
  level: WarningLevel;
  stallCount: number;
  connectedStallCount: number;
}
