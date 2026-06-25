import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Loader2, Eye, CalendarPlus, MessageCircle, MessageSquare } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { MultiSelect } from "@/components/MultiSelect";
import { Button, Badge } from "@/components/ui/primitives";
import { useLeads, useLeadStatuses, useLeadSources, leadName, type Lead, type LeadFilters } from "./api";
import { statusTone } from "./constants";
import { NewLeadModal } from "./NewLeadModal";
import { ViewLeadModal } from "./ViewLeadModal";
import { AppointmentModal } from "./AppointmentModal";
import { SmsModal } from "./SmsModal";
import { WhatsappModal } from "./WhatsappModal";

const LIMIT = 20;

const fmtDateTime = (raw?: string) => {
  if (!raw) return "—";
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? raw : dt.toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit" });
};
const fmtDate = (raw?: string | null) => {
  if (!raw) return "—";
  const dt = new Date(raw);
  return isNaN(dt.getTime()) ? raw : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const dateInputCls = "h-[38px] rounded-lg border border-border bg-surface px-2.5 text-sm text-ink-2 outline-none focus:border-brand";

export function Leads() {
  const [params] = useSearchParams();
  const todayFollowup = params.get("display") === "Today";
  const today = new Date().toISOString().slice(0, 10);

  const { search, setSearch, debounced, page, setPage } = useListState();
  const [statusSel, setStatusSel] = useState<string[]>([]);
  const [sourceSel, setSourceSel] = useState<string[]>([]);
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [followFrom, setFollowFrom] = useState(todayFollowup ? today : "");
  const [followTo, setFollowTo] = useState(todayFollowup ? today : "");

  const [newOpen, setNewOpen] = useState(false);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
  const [apptLead, setApptLead] = useState<Lead | null>(null);
  const [smsLead, setSmsLead] = useState<Lead | null>(null);
  const [waLead, setWaLead] = useState<Lead | null>(null);

  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data: statuses } = useLeadStatuses();
  const { data: sources } = useLeadSources();

  const filters: LeadFilters = useMemo(() => ({
    name: debounced,
    status: statusSel.join(","),
    source: sourceSel.join(","),
    startDate: createdFrom,
    endDate: createdTo,
    followupDateStart: followFrom,
    followupDateEnd: followTo,
  }), [debounced, statusSel, sourceSel, createdFrom, createdTo, followFrom, followTo]);

  const { data, isLoading, isFetching } = useLeads(page, LIMIT, filters);
  const count = data?.count ?? 0;

  const sourceMap = useMemo(() => {
    const m = new Map<string, string>();
    (sources ?? []).forEach((s) => m.set(String(s.id), s.source));
    return m;
  }, [sources]);

  const onFilters = () => setPage(1);

  const refresh = () => qc.invalidateQueries({ queryKey: ["leads"] });

  const columns: Column<Lead>[] = [
    { header: "Created", cell: (l) => fmtDateTime(l.dateCreated) },
    { header: "Customer name", cell: (l) => leadName(l) },
    {
      header: "Status",
      cell: (l) => {
        const s = l.leadStatus?.status;
        return s ? <Badge tone={statusTone(l.leadStatus?.id ?? l.statusId)}>{s}</Badge> : "—";
      },
    },
    { header: "Next follow-up", cell: (l) => fmtDate(l.followupDate) },
    { header: "Source", cell: (l) => l.leadSource?.source || (l.fromCampaign != null ? sourceMap.get(String(l.fromCampaign)) : "") || "NA" },
    { header: "First bill", align: "right", cell: () => <span className="text-ink-3">₹0</span> },
    {
      header: "Actions",
      cell: (l) => (
        <div className="flex items-center gap-1.5">
          <IconBtn label="View" onClick={() => setViewLead(l)}><Eye className="h-4 w-4" /></IconBtn>
          <IconBtn label="Book appointment" onClick={() => setApptLead(l)}><CalendarPlus className="h-4 w-4" /></IconBtn>
          <IconBtn label="WhatsApp" onClick={() => setWaLead(l)}><MessageCircle className="h-4 w-4" /></IconBtn>
          <IconBtn label="SMS" onClick={() => setSmsLead(l)}><MessageSquare className="h-4 w-4" /></IconBtn>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Leads</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> New Lead
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone…"
              className="w-52 bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
          </label>

          <MultiSelect
            label="Status"
            options={(statuses ?? []).map((s) => ({ value: String(s.id), label: s.status }))}
            selected={statusSel}
            onChange={(v) => { setStatusSel(v); onFilters(); }}
          />
          <MultiSelect
            label="Lead Source"
            options={(sources ?? []).map((s) => ({ value: String(s.id), label: s.source }))}
            selected={sourceSel}
            onChange={(v) => { setSourceSel(v); onFilters(); }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
          <DateRange label="Created" from={createdFrom} to={createdTo}
            onFrom={(v) => { setCreatedFrom(v); onFilters(); }} onTo={(v) => { setCreatedTo(v); onFilters(); }} />
          <DateRange label="Follow-up" from={followFrom} to={followTo}
            onFrom={(v) => { setFollowFrom(v); onFilters(); }} onTo={(v) => { setFollowTo(v); onFilters(); }} />
        </div>
      </div>

      {/* Legend */}
      {configured && (statuses?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          {(statuses ?? []).map((s) => (
            <Badge key={s.id} tone={statusTone(s.id)}>{s.status}</Badge>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data?.leads ?? []}
        getRowId={(l) => String(l.id)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={Math.max(1, Math.ceil(count / LIMIT))}
        count={count}
        onPage={setPage}
        emptyText="No leads found."
        countNoun="leads"
      />

      <NewLeadModal open={newOpen} onClose={() => setNewOpen(false)} onCreated={refresh} />
      <ViewLeadModal lead={viewLead} onClose={() => setViewLead(null)} onUpdated={refresh}
        onBookAppointment={(l) => { setViewLead(null); setApptLead(l); }} />
      <AppointmentModal lead={apptLead} onClose={() => setApptLead(null)} />
      <SmsModal lead={smsLead} onClose={() => setSmsLead(null)} />
      <WhatsappModal lead={waLead} onClose={() => setWaLead(null)} />
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface text-ink-2 hover:bg-surface-2 hover:text-brand"
    >
      {children}
    </button>
  );
}

function DateRange({ label, from, to, onFrom, onTo }: {
  label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-ink-3">{label}:</span>
      <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={dateInputCls} aria-label={`${label} from`} />
      <span className="text-ink-3">to</span>
      <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={dateInputCls} aria-label={`${label} to`} />
      {(from || to) && (
        <button type="button" onClick={() => { onFrom(""); onTo(""); }} className="text-xs font-semibold text-brand hover:underline">Clear</button>
      )}
    </div>
  );
}
