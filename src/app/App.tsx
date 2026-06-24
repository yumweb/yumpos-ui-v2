import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WorkspaceShell } from "@/shells/WorkspaceShell";
import { BentoHome } from "@/features/home/BentoHome";
import { POS } from "@/features/sales/POS";
import { Customers } from "@/features/customers/Customers";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { isAuthenticated } from "@/lib/auth";
import { Providers } from "./providers";
import { ALL_ROUTES } from "./nav";

const BUILT = new Set(["/home", "/sales", "/customers"]);

/** Route guard — unauthenticated users go to /login (preserving intended path). */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
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
