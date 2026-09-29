import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DriverConfig {
  enabled: boolean;
  hostname: string | null;
}

export interface ConfigStore {
  driver: { active: string };
  drivers: Record<string, DriverConfig>;
  setEnabled: (driver: string, enabled: boolean) => void;
  setHostname: (driver: string, hostname: string) => void;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      driver: { active: "mullvad-wireguard" },
      drivers: {
        "mullvad-wireguard": { enabled: false, hostname: null },
      },
      setEnabled: (driver, enabled) =>
        set((state) => ({
          drivers: {
            ...state.drivers,
            [driver]: { ...state.drivers[driver], enabled },
          },
        })),
      setHostname: (driver, hostname) =>
        set((state) => ({
          drivers: {
            ...state.drivers,
            [driver]: { ...state.drivers[driver], hostname },
          },
        })),
    }),
    { name: "chakana-config" },
  ),
);
