import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceShell } from "@/shells/WorkspaceShell";
import { BentoHome } from "@/features/home/BentoHome";
import { POS } from "@/features/sales/POS";
import { Customers } from "@/features/customers/Customers";
import { Leads } from "@/features/leads/Leads";
import { FamilyCards } from "@/features/familyCards/FamilyCards";
import { GiftCards } from "@/features/giftCards/GiftCards";
import { Coupons } from "@/features/coupons/Coupons";
import { Services } from "@/features/services/Services";
import { RetailProducts } from "@/features/retail/RetailProducts";
import { ItemKits } from "@/features/itemKits/ItemKits";
import { Suppliers } from "@/features/suppliers/Suppliers";
import { Receivings } from "@/features/receivings/Receivings";
import { ReportsHome } from "@/features/reports/ReportsHome";
import { ReportPlaceholder } from "@/features/reports/ReportPlaceholder";
import { Employees } from "@/features/employees/Employees";
import { Locations } from "@/features/locations/Locations";
import { Appointments } from "@/features/appointments/Appointments";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { isAuthenticated, isAdmin } from "@/lib/auth";
import { Providers } from "./providers";
import { ALL_ROUTES } from "./nav";

const BUILT = new Set(["/home", "/sales", "/customers", "/leads", "/family-cards", "/gift-cards", "/coupons", "/services", "/retail-products", "/item-kits", "/suppliers", "/receivings", "/reports", "/employees", "/locations", "/appointments"]);

/** Route guard — unauthenticated users go to /login (preserving intended path). */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Admin-only route guard — non-admins are sent home. */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  if (!isAdmin()) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

/** Honest placeholder for a real module not yet ported from the existing app. */
function ModulePage({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-12 text-center shadow-sm2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-lg text-ink-2">
        Existing module — to be ported from the current app and wired to its real
        endpoints. No placeholder data is shown here on purpose.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route
            element={
              <RequireAuth>
                <WorkspaceShell />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<BentoHome />} />
            <Route path="/sales" element={<POS />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/family-cards" element={<FamilyCards />} />
            <Route path="/gift-cards" element={<GiftCards />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/services" element={<Services />} />
            <Route path="/retail-products" element={<RetailProducts />} />
            <Route path="/item-kits" element={<ItemKits />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/receivings" element={<Receivings />} />
            <Route path="/reports" element={<ReportsHome />} />
            <Route path="/reports/:slug" element={<ReportPlaceholder />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/locations" element={<RequireAdmin><Locations /></RequireAdmin>} />
            {ALL_ROUTES.filter((r) => !BUILT.has(r.path)).map((r) => (
              <Route key={r.path} path={r.path} element={<ModulePage title={r.label} />} />
            ))}
          </Route>
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
