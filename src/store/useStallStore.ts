import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Stall } from "@/types";
import { StallStatus } from "@/types/enums";
import { seedStalls } from "@/data/seed";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

interface StallState {
  stalls: Stall[];
  addStall: (data: Omit<Stall, "id" | "createdAt" | "updatedAt" | "locked" | "status" | "occupiedCapacity" | "adjacentStallIds"> & { adjacentStallIds?: string[]; status?: StallStatus; occupiedCapacity?: number }) => void;
  updateStall: (id: string, data: Partial<Stall>) => void;
  deleteStall: (id: string) => boolean;
  setStatus: (id: string, status: StallStatus) => void;
  setLocked: (id: string, locked: boolean) => void;
  setOccupied: (id: string, occupied: number) => void;
  reset: () => void;
}

export const useStallStore = create<StallState>()(
  persist(
    (set, get) => ({
      stalls: [...seedStalls],
      addStall: (data) =>
        set((s) => ({
          stalls: [
            ...s.stalls,
            {
              adjacentStallIds: [],
              status: StallStatus.IDLE,
              occupiedCapacity: 0,
              locked: false,
              ...data,
              id: genId("stall"),
              createdAt: nowISO(),
              updatedAt: nowISO(),
            },
          ],
        })),
      updateStall: (id, data) =>
        set((s) => ({
          stalls: s.stalls.map((st) =>
            st.id === id ? { ...st, ...data, updatedAt: nowISO() } : st
          ),
        })),
      deleteStall: (id) => {
        const s = get();
        const target = s.stalls.find((st) => st.id === id);
        if (!target) return false;
        if (target.locked) return false;
        set({ stalls: s.stalls.filter((st) => st.id !== id) });
        return true;
      },
      setStatus: (id, status) => {
        get().updateStall(id, { status });
      },
      setLocked: (id, locked) => {
        get().updateStall(id, { locked });
      },
      setOccupied: (id, occupied) => {
        get().updateStall(id, { occupiedCapacity: occupied });
      },
      reset: () => set({ stalls: [...seedStalls] }),
    }),
    { name: "market-stalls" }
  )
);
