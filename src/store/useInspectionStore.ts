import { create } from "zustand";
import { persist } from "zustand/middleware";
import { InspectionRecord, SuspensionRecord } from "@/types";
import { seedInspections, seedSuspensions } from "@/data/seed";
import { StallStatus, SuspensionStatus } from "@/types/enums";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";
import { useStallStore } from "./useStallStore";
import { useAuthStore } from "./useAuthStore";

interface InspectionState {
  inspections: InspectionRecord[];
  suspensions: SuspensionRecord[];
  addInspection: (data: Omit<InspectionRecord, "id" | "inspectedAt" | "inspectorName">) => string;
  suspendStall: (
    stallId: string,
    reason: string,
    inspectionRecordId?: string
  ) => string | null;
  restoreStall: (stallId: string, remark?: string) => boolean;
  reset: () => void;
}

export const useInspectionStore = create<InspectionState>()(
  persist(
    (set, get) => ({
      inspections: [...seedInspections],
      suspensions: [...seedSuspensions],
      addInspection: (data) => {
        const { currentUserName } = useAuthStore.getState();
        const id = genId("insp");
        set((s) => ({
          inspections: [
            ...s.inspections,
            { ...data, id, inspectorName: currentUserName, inspectedAt: nowISO() },
          ],
        }));
        return id;
      },
      suspendStall: (stallId, reason, inspectionRecordId) => {
        const stall = useStallStore.getState().stalls.find((s) => s.id === stallId);
        if (!stall || stall.status !== StallStatus.CONNECTED) return null;
        const { currentUserName } = useAuthStore.getState();
        const id = genId("susp");
        set((s) => ({
          suspensions: [
            ...s.suspensions,
            {
              id,
              stallId,
              inspectionRecordId,
              reason,
              operatorName: currentUserName,
              status: SuspensionStatus.SUSPENDED,
              suspendedAt: nowISO(),
            },
          ],
        }));
        useStallStore.getState().setStatus(stallId, StallStatus.SUSPENDED);
        return id;
      },
      restoreStall: (stallId, remark) => {
        const { currentUserName } = useAuthStore.getState();
        const s = get();
        const stall = useStallStore.getState().stalls.find((st) => st.id === stallId);
        if (!stall || stall.status !== StallStatus.SUSPENDED) return false;
        set((state) => ({
          suspensions: state.suspensions
            .sort((a, b) => String(b.suspendedAt || "").localeCompare(String(a.suspendedAt || "")))
            .map((susp, idx, arr) => {
              if (
                susp.stallId === stallId &&
                susp.status === SuspensionStatus.SUSPENDED &&
                !arr.slice(0, idx).some((x) => x.stallId === stallId && x.status === SuspensionStatus.SUSPENDED)
              ) {
                return {
                  ...susp,
                  status: SuspensionStatus.RESTORED,
                  restoreRemark: remark || "整改完成，恢复供电",
                  restorerName: currentUserName,
                  restoredAt: nowISO(),
                };
              }
              return susp;
            }),
        }));
        useStallStore.getState().setStatus(stallId, StallStatus.CONNECTED);
        return true;
      },
      reset: () =>
        set({
          inspections: [...seedInspections],
          suspensions: [...seedSuspensions],
        }),
    }),
    { name: "market-inspection" }
  )
);
