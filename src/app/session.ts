import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Session {
  office: boolean;
  driverId?: string;
  selectedTripId?: string;
  signInOffice: () => void;
  signInDriver: (id: string) => void;
  signOutOffice: () => void;
  signOutDriver: () => void;
  selectTrip: (id?: string) => void;
}

export const useSession = create<Session>()(
  persist(
    (set) => ({
      office: false,
      signInOffice: () => set({ office: true }),
      signInDriver: (id) => set({ driverId: id, selectedTripId: undefined }),
      signOutOffice: () => set({ office: false }),
      signOutDriver: () => set({ driverId: undefined, selectedTripId: undefined }),
      selectTrip: (id) => set({ selectedTripId: id }),
    }),
    { name: "kn-session" },
  ),
);
