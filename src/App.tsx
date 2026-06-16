import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/common/Toast";
import Dashboard from "@/pages/Dashboard";
import OperationWorkbench from "@/pages/OperationWorkbench";
import MerchantApplication from "@/pages/MerchantApplication";
import ElectricianStation from "@/pages/ElectricianStation";
import InspectionStation from "@/pages/InspectionStation";
import CapacityMonitor from "@/pages/CapacityMonitor";

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="operation" element={<OperationWorkbench />} />
            <Route path="merchant" element={<MerchantApplication />} />
            <Route path="electrician" element={<ElectricianStation />} />
            <Route path="inspection" element={<InspectionStation />} />
            <Route path="capacity" element={<CapacityMonitor />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}
