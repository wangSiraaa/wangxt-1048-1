import {
  DistributionBox,
  Stall,
  ElectricityApplication,
  ConnectionRecord,
  InspectionRecord,
  SuspensionRecord,
  DeviceItem,
} from "@/types";
import {
  LineStatus,
  StallStatus,
  StallType,
  ApplicationStatus,
  InspectionResult,
  SuspensionStatus,
} from "@/types/enums";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

const H = new Date(Date.now() - 72 * 3600000).toISOString();
const D1 = new Date(Date.now() - 86400000).toISOString();

export const seedBoxes: DistributionBox[] = [
  {
    id: "box_001",
    code: "PDX-A01",
    location: "市集东区入口",
    ratedCapacity: 60,
    lineStatus: LineStatus.NORMAL,
    description: "东一区配电箱，服务A1-A6摊位",
    createdAt: H,
    updatedAt: H,
  },
  {
    id: "box_002",
    code: "PDX-A02",
    location: "市集东区中段",
    ratedCapacity: 50,
    lineStatus: LineStatus.NORMAL,
    description: "东二区配电箱，服务A7-A12摊位",
    createdAt: H,
    updatedAt: H,
  },
  {
    id: "box_003",
    code: "PDX-B01",
    location: "市集西区主通道",
    ratedCapacity: 80,
    lineStatus: LineStatus.NORMAL,
    description: "西一区配电箱，服务B1-B10摊位",
    createdAt: H,
    updatedAt: H,
  },
];

const stallDefs = [
  { code: "A01", name: "东区1号摊", boxIdx: 0, row: 1, col: 1, type: StallType.FOOD, cap: 8 },
  { code: "A02", name: "东区2号摊", boxIdx: 0, row: 1, col: 2, type: StallType.NORMAL, cap: 5 },
  { code: "A03", name: "东区3号摊", boxIdx: 0, row: 1, col: 3, type: StallType.NORMAL, cap: 5 },
  { code: "A04", name: "东区4号摊", boxIdx: 0, row: 2, col: 1, type: StallType.FOOD, cap: 10 },
  { code: "A05", name: "东区5号摊", boxIdx: 0, row: 2, col: 2, type: StallType.NORMAL, cap: 5 },
  { code: "A06", name: "东区6号摊", boxIdx: 0, row: 2, col: 3, type: StallType.NORMAL, cap: 6 },
  { code: "A07", name: "东区7号摊", boxIdx: 1, row: 1, col: 4, type: StallType.NORMAL, cap: 4 },
  { code: "A08", name: "东区8号摊", boxIdx: 1, row: 1, col: 5, type: StallType.FOOD, cap: 8 },
  { code: "A09", name: "东区9号摊", boxIdx: 1, row: 2, col: 4, type: StallType.NORMAL, cap: 5 },
  { code: "A10", name: "东区10号摊", boxIdx: 1, row: 2, col: 5, type: StallType.NORMAL, cap: 4 },
  { code: "B01", name: "西区1号摊", boxIdx: 2, row: 1, col: 6, type: StallType.FOOD, cap: 12 },
  { code: "B02", name: "西区2号摊", boxIdx: 2, row: 1, col: 7, type: StallType.NORMAL, cap: 6 },
  { code: "B03", name: "西区3号摊", boxIdx: 2, row: 2, col: 6, type: StallType.NORMAL, cap: 5 },
  { code: "B04", name: "西区4号摊", boxIdx: 2, row: 2, col: 7, type: StallType.FOOD, cap: 10 },
  { code: "B05", name: "西区5号摊", boxIdx: 2, row: 3, col: 6, type: StallType.NORMAL, cap: 4 },
  { code: "B06", name: "西区6号摊", boxIdx: 2, row: 3, col: 7, type: StallType.NORMAL, cap: 6 },
];

export const seedStalls: Stall[] = stallDefs.map((d, idx) => ({
  id: `stall_${(idx + 1).toString().padStart(3, "0")}`,
  code: d.code,
  name: d.name,
  distributionBoxId: seedBoxes[d.boxIdx].id,
  ratedCapacity: d.cap,
  occupiedCapacity: 0,
  adjacentStallIds: [],
  stallType: d.type,
  status: StallStatus.IDLE,
  locked: false,
  gridRow: d.row,
  gridCol: d.col,
  createdAt: H,
  updatedAt: H,
}));

seedStalls[0].status = StallStatus.CONNECTED;
seedStalls[0].occupiedCapacity = 6.5;
seedStalls[0].locked = true;

seedStalls[3].status = StallStatus.APPLYING;
seedStalls[3].occupiedCapacity = 0;

seedStalls[7].status = StallStatus.CONNECTED;
seedStalls[7].occupiedCapacity = 7.2;
seedStalls[7].locked = true;

seedStalls[10].status = StallStatus.CONNECTED;
seedStalls[10].occupiedCapacity = 10.5;
seedStalls[10].locked = true;

seedStalls[13].status = StallStatus.SUSPENDED;
seedStalls[13].occupiedCapacity = 9.0;
seedStalls[13].locked = true;

seedStalls[11].status = StallStatus.APPLYING;

const makeDevices = (list: [string, number, number][]): DeviceItem[] =>
  list.map(([name, qty, unit]) => ({
    id: genId("dev"),
    applicationId: "",
    deviceName: name,
    quantity: qty,
    unitPower: unit,
    totalPower: +(qty * unit).toFixed(2),
  }));

export const seedApplications: ElectricityApplication[] = [
  {
    id: "app_001",
    stallId: seedStalls[3].id,
    merchantName: "张记手作奶茶",
    contactInfo: "13800138001",
    isFoodStall: true,
    foodLicenseNo: "JY13101010012345",
    peakPower: 8.5,
    activityPeriod: "周末10:00-22:00",
    requirementDesc: "制冰机、封口机、冷柜连续使用",
    status: ApplicationStatus.PENDING,
    createdAt: H,
    devices: makeDevices([
      ["制冰机", 1, 3.5],
      ["冷藏柜", 1, 2.0],
      ["封口机", 1, 0.8],
      ["LED灯条", 2, 0.4],
    ]).map((d) => ({ ...d, applicationId: "app_001" })),
  },
  {
    id: "app_002",
    stallId: seedStalls[11].id,
    merchantName: "潮玩手办小铺",
    contactInfo: "13900139002",
    isFoodStall: false,
    peakPower: 4.5,
    activityPeriod: "全周14:00-21:00",
    requirementDesc: "展示柜灯光和收银设备",
    status: ApplicationStatus.APPROVED,
    approverName: "李运营",
    approvalOpinion: "容量充足，同意接入",
    approvedAt: H,
    createdAt: H,
    devices: makeDevices([
      ["LED展示柜", 2, 1.2],
      ["收银机", 1, 0.3],
      ["空调扇", 1, 0.8],
    ]).map((d) => ({ ...d, applicationId: "app_002" })),
  },
];

export const seedConnections: ConnectionRecord[] = [
  {
    id: "conn_001",
    applicationId: "conn_app_001",
    stallId: seedStalls[0].id,
    electricianName: "王电工",
    remainingCapacity: 53.5,
    lineStatusCheck: LineStatus.NORMAL,
    safetyCheckResult: "pass",
    signature: "王建国",
    remarks: "接线规范，接地良好",
    connectedAt: H,
  },
  {
    id: "conn_002",
    applicationId: "conn_app_002",
    stallId: seedStalls[7].id,
    electricianName: "赵电工",
    remainingCapacity: 42.8,
    lineStatusCheck: LineStatus.NORMAL,
    safetyCheckResult: "pass",
    signature: "赵明",
    connectedAt: H,
  },
  {
    id: "conn_003",
    applicationId: "conn_app_003",
    stallId: seedStalls[10].id,
    electricianName: "王电工",
    remainingCapacity: 69.5,
    lineStatusCheck: LineStatus.NORMAL,
    safetyCheckResult: "pass",
    signature: "王建国",
    remarks: "油烟分离器已接漏电保护",
    connectedAt: H,
  },
];

export const seedInspections: InspectionRecord[] = [
  {
    id: "insp_001",
    stallId: seedStalls[13].id,
    inspectorName: "刘巡检",
    measuredLoad: 12.8,
    isOverload: true,
    abnormalities: ["实测负载超过摊位额定容量", "油炸锅线路发热严重", "私加拖线板"],
    inspectionResult: InspectionResult.ABNORMAL,
    remarks: "超载严重，已现场暂停用电，要求整改后复查",
    inspectedAt: H,
  },
  {
    id: "insp_002",
    stallId: seedStalls[0].id,
    inspectorName: "刘巡检",
    measuredLoad: 6.1,
    isOverload: false,
    abnormalities: [],
    inspectionResult: InspectionResult.NORMAL,
    remarks: "设备运行正常",
    inspectedAt: H,
  },
];

export const seedSuspensions: SuspensionRecord[] = [
  {
    id: "susp_001",
    stallId: seedStalls[13].id,
    inspectionRecordId: "insp_001",
    reason: "用电设备超载，实测12.8kW超过额定10kW",
    operatorName: "刘巡检",
    status: SuspensionStatus.SUSPENDED,
    suspendedAt: H,
  },
];

export function resetSeedTimestamps() {
  const now = nowISO();
  seedBoxes.forEach((b) => {
    b.createdAt = now;
    b.updatedAt = now;
  });
  seedStalls.forEach((s) => {
    s.createdAt = now;
    s.updatedAt = now;
  });
  seedApplications.forEach((a) => {
    a.createdAt = now;
    if (a.approvedAt) a.approvedAt = now;
  });
  seedConnections.forEach((c) => (c.connectedAt = now));
  seedInspections.forEach((i) => (i.inspectedAt = now));
  seedSuspensions.forEach((s) => (s.suspendedAt = now));
}
