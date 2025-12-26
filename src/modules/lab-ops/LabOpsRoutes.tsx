/**
 * Lab Ops Module - Isolated Bundle
 * 
 * This module is code-split from the main app for:
 * - Independent loading (users not using Lab Ops don't download it)
 * - Better caching (Lab Ops bundle cached separately)
 * - Isolated performance (heavy Lab Ops usage doesn't affect main app)
 */

import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

// Lazy load all Lab Ops pages within this bundle
const LabOps = lazy(() => import("@/pages/LabOps"));
const LabOpsPromo = lazy(() => import("@/pages/LabOpsPromo"));
const LabOpsStaffPinAccess = lazy(() => import("@/pages/LabOpsStaffPinAccess"));
const StaffPOS = lazy(() => import("@/pages/StaffPOS"));
const StaffPOSPrint = lazy(() => import("@/pages/StaffPOSPrint"));
const StaffInstall = lazy(() => import("@/pages/StaffInstall"));
const StaffQRAccess = lazy(() => import("@/pages/StaffQRAccess"));
const BarKDS = lazy(() => import("@/pages/BarKDS"));
const KitchenKDS = lazy(() => import("@/pages/KitchenKDS"));

// Lab Ops specific loader - minimal and fast
const LabOpsLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-muted-foreground">Loading Lab Ops...</span>
    </div>
  </div>
);

/**
 * Lab Ops Routes Component
 * 
 * All Lab Ops related routes are bundled here.
 * This component is lazy-loaded from the main App.tsx,
 * creating a separate chunk for the entire Lab Ops module.
 */
export default function LabOpsRoutes() {
  return (
    <Suspense fallback={<LabOpsLoader />}>
      <Routes>
        {/* Main Lab Ops Dashboard */}
        <Route path="/" element={<LabOps />} />
        
        {/* Lab Ops Promotional Page */}
        <Route path="/promo" element={<LabOpsPromo />} />
        
        {/* Staff Access & Authentication */}
        <Route path="/staff-pin" element={<LabOpsStaffPinAccess />} />
        <Route path="/staff-qr" element={<StaffQRAccess />} />
        <Route path="/staff-install" element={<StaffInstall />} />
        
        {/* Point of Sale */}
        <Route path="/pos" element={<StaffPOS />} />
        <Route path="/pos/print" element={<StaffPOSPrint />} />
        
        {/* Kitchen Display Systems */}
        <Route path="/bar-kds" element={<BarKDS />} />
        <Route path="/kitchen-kds" element={<KitchenKDS />} />
      </Routes>
    </Suspense>
  );
}
