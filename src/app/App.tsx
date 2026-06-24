import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WorkspaceShell } from "@/shells/WorkspaceShell";
import { BentoHome } from "@/features/home/BentoHome";
import { POS } from "@/features/sales/POS";
import { Providers } from "./providers";
import { ALL_ROUTES } from "./nav";

const BUILT = new Set(["/home", "/sales"]);

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
          <Route element={<WorkspaceShell />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<BentoHome />} />
            <Route path="/sales" element={<POS />} />
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
