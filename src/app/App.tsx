import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WorkspaceShell } from "@/shells/WorkspaceShell";
import { BentoHome } from "@/features/home/BentoHome";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-12 text-center shadow-sm2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-2">
        Next sprint. This screen is fully wireframed in
        <code className="mx-1 rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">
          claude-documentation/wireframes/v3
        </code>
        and will be built on the same components.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<WorkspaceShell />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<BentoHome />} />
          <Route path="/sales" element={<Placeholder title="Sales · POS" />} />
          <Route path="/calendar" element={<Placeholder title="Calendar" />} />
          <Route path="/clients" element={<Placeholder title="Clients" />} />
          <Route path="/reports" element={<Placeholder title="Reports" />} />
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
