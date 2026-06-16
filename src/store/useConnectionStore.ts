import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ConnectionRecord } from "@/types";
import { seedConnections } from "@/data/seed";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";

interface ConnectionState {
  records: ConnectionRecord[];
  connections: ConnectionRecord[];
  addRecord: (data: Omit<ConnectionRecord, "id" | "connectedAt">) => string;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      records: [...seedConnections],
      connections: [...seedConnections],
      addRecord: (data) => {
        const id = genId("conn");
        const newRecord = { ...data, id, connectedAt: nowISO() };
        set((s) => ({
          records: [...s.records, newRecord],
          connections: [...s.connections, newRecord],
        }));
        return id;
      },
      reset: () =>
        set({
          records: [...seedConnections],
          connections: [...seedConnections],
        }),
    }),
    { name: "market-connections" }
  )
);
