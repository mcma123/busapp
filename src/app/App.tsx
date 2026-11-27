import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { SignIn } from "./SignIn";
import { OfficeLayout } from "./OfficeLayout";
import { DriverLayout } from "./DriverLayout";
import { Overview } from "@/features/overview/Overview";
import { LearnerList } from "@/features/learners/LearnerList";
import { LearnerProfile } from "@/features/learners/LearnerProfile";
import { BatchPasses } from "@/features/learners/BatchPasses";
import { Fleet } from "@/features/fleet/Fleet";
import { RouteDetail } from "@/features/fleet/RouteDetail";
import { TripManifest } from "@/features/fleet/TripManifest";
import { Payments } from "@/features/payments/Payments";
import { Activity } from "@/features/activity/Activity";
import { Exceptions } from "@/features/exceptions/Exceptions";
import { DriverToday } from "@/features/driver/DriverToday";
import { DriverScan } from "@/features/driver/DriverScan";
import { DriverRegister } from "@/features/driver/DriverRegister";

export function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/office" element={<OfficeLayout />}>
            <Route index element={<Overview />} />
            <Route path="learners" element={<LearnerList />} />
            <Route path="learners/:id" element={<LearnerProfile />} />
            <Route path="passes" element={<BatchPasses />} />
            <Route path="fleet" element={<Fleet />} />
            <Route path="fleet/:routeId" element={<RouteDetail />} />
            <Route path="trips/:tripId" element={<TripManifest />} />
            <Route path="payments" element={<Payments />} />
            <Route path="activity" element={<Activity />} />
            <Route path="exceptions" element={<Exceptions />} />
          </Route>
          <Route path="/driver" element={<DriverLayout />}>
            <Route index element={<DriverToday />} />
            <Route path="scan" element={<DriverScan />} />
            <Route path="register" element={<DriverRegister />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton />
    </TooltipProvider>
  );
}
