import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { isApiConfigured } from "@/lib/apiClient";
import { useListState } from "@/lib/useListState";
import { DataTable, type Column } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/primitives";
import { useEmployees, useDeleteEmployee, employeeFullName, type EmployeeRow } from "./api";
import { EmployeeModal } from "./EmployeeModal";

const LIMIT = 20;

export function Employees() {
  const { search, setSearch, debounced, page, setPage } = useListState();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [toDelete, setToDelete] = useState<EmployeeRow | null>(null);
  const configured = isApiConfigured();
  const qc = useQueryClient();

  const { data: all, isLoading, isFetching } = useEmployees();
  const del = useDeleteEmployee();

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    const list = all ?? [];
    if (!q) return list;
    return list.filter((e) =>
      [employeeFullName(e), e.username, e.email].join(" ").toLowerCase().includes(q));
  }, [all, debounced]);

  const count = filtered.length;
  const maxPage = Math.max(1, Math.ceil(count / LIMIT));
  const rows = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  const refresh = () => qc.invalidateQueries({ queryKey: ["employees"] });

  function confirmDelete() {
    if (!toDelete) return;
    del.mutate(toDelete.personId, {
      onSuccess: () => { setToDelete(null); refresh(); },
    });
  }

  const columns: Column<EmployeeRow>[] = [
    { header: "Person ID", cell: (e) => <span className="tnum text-ink-3">#{e.personId}</span> },
    { header: "Name", cell: (e) => <span className="font-semibold">{employeeFullName(e)}</span> },
    { header: "Username", cell: (e) => e.username || "—" },
    { header: "Email", cell: (e) => e.email || "—" },
    { header: "Phone", cell: (e) => <span className="tnum">{e.phoneNumber || "—"}</span> },
    {
      header: "Action",
      cell: (e) => (
        <div className="flex items-center gap-3">
          <button onClick={() => setEditId(e.personId)} className="font-semibold text-brand hover:underline">Edit</button>
          <button onClick={() => setToDelete(e)} aria-label="Delete"
            className="grid h-7 w-7 place-items-center rounded-md text-ink-3 hover:bg-[var(--danger-soft)] hover:text-danger">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[25px] font-bold tracking-tight">Employees</h1>
        {configured && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-surface-2 px-2 text-sm font-semibold text-ink-2">
            {count.toLocaleString("en-IN")}
          </span>
        )}
        <div className="flex-1" />
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New Employee
        </Button>
      </div>

      <label className="flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2">
        <Search className="h-4 w-4 text-ink-3" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, username, email…"
          className="w-64 bg-transparent text-sm outline-none placeholder:text-ink-3"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-ink-3" />}
      </label>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(e) => String(e.personId)}
        configured={configured}
        loading={isLoading}
        page={page}
        maxPage={maxPage}
        count={count}
        onPage={setPage}
        emptyText="No employees found."
        countNoun="employees"
      />

      <EmployeeModal
        open={creating || editId != null}
        editPersonId={editId}
        onClose={() => { setCreating(false); setEditId(null); }}
        onSaved={refresh}
      />

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete employee" width="max-w-[420px]">
        <div className="grid gap-4 p-5">
          <p className="text-sm text-ink-2">
            Delete <span className="font-semibold text-ink">{toDelete ? employeeFullName(toDelete) : ""}</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="default" onClick={() => setToDelete(null)}>Cancel</Button>
            <Button type="button" variant="danger" onClick={confirmDelete} disabled={del.isPending}>
              {del.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
