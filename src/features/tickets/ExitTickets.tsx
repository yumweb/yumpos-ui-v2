import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/primitives";
import { useExitTickets, type ExitTicket } from "./api";
import { designationLabel } from "./constants";
import { NewTicketModal } from "./NewTicketModal";

const LIMIT = 10;
const fmt = (raw?: string) => {
  if (!raw) return "—";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit" });
};

export function ExitTickets() {
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const configured = isApiConfigured();
  const qc = useQueryClient();
  const { data, isLoading } = useExitTickets(page, LIMIT);
  const count = data?.count ?? 0;

  const columns: Column<ExitTicket>[] = [
    { header: "Location", cell: (t) => t.location?.name || "—" },
    { header: "Ticket #", cell: (t) => <span className="tnum">#{t.id}</span> },
    { header: "Date", cell: (t) => fmt(t.ticketTime) },
    { header: "Candidate", cell: (t) => <span className="font-semibold">{t.candidateName || "—"}</span> },
    { header: "Designation", cell: (t) => designationLabel(t.candidateDesignation) },
    { header: "Relieving", cell: (t) => fmt(t.relievingDate) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-2">Staff exit records.</p>
        <Button variant="primary" onClick={() => setNewOpen(true)}><Plus className="h-4 w-4" /> New Exit Ticket</Button>
      </div>
      <DataTable
        columns={columns}
        rows={data?.tickets ?? []}
        getRowId={(t) => String(t.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No staff exit tickets."
        countNoun="exit tickets"
      />
      <NewTicketModal open={newOpen} initialTab="exit" onClose={() => setNewOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["exit-tickets"] })} />
    </div>
  );
}
