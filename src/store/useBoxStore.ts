import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DistributionBox } from "@/types";
import { LineStatus } from "@/types/enums";
import { seedBoxes } from "@/data/seed";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

interface BoxState {
  boxes: DistributionBox[];
  addBox: (data: Omit<DistributionBox, "id" | "createdAt" | "updatedAt">) => void;
  updateBox: (id: string, data: Partial<DistributionBox>) => void;
  deleteBox: (id: string) => boolean;
  setLineStatus: (id: string, status: LineStatus) => void;
  reset: () => void;
}

export const useBoxStore = create<BoxState>()(
  persist(
    (set, get) => ({
      boxes: [...seedBoxes],
      addBox: (data) =>
        set((s) => ({
          boxes: [
            ...s.boxes,
            {
              ...data,
              id: genId("box"),
              createdAt: nowISO(),
              updatedAt: nowISO(),
            },
          ],
        })),
      updateBox: (id, data) =>
        set((s) => ({
          boxes: s.boxes.map((b) =>
            b.id === id ? { ...b, ...data, updatedAt: nowISO() } : b
          ),
        })),
      deleteBox: (id) => {
        const s = get();
        const exists = s.boxes.some((b) => b.id === id);
        if (exists) {
          set({ boxes: s.boxes.filter((b) => b.id !== id) });
        }
        return exists;
      },
      setLineStatus: (id, status) => {
        get().updateBox(id, { lineStatus: status });
      },
      reset: () => set({ boxes: [...seedBoxes] }),
    }),
    { name: "market-boxes" }
  )
);
