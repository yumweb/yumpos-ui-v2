import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Image as ImageIcon, Send } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { useGmbPosts, createGmbPost, deleteGmbPost, uploadGmbImage, type GmbPost } from "./api";

const fmt = (raw?: string) => raw ? new Date(raw).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

export function PostsTab() {
  const qc = useQueryClient();
  const { data: posts, isLoading, isError } = useGmbPosts(true);
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["gmb-posts"] });

  async function publish() {
    if (!summary.trim()) { setErr("Write something to post."); return; }
    setBusy(true); setErr(""); setOk("");
    try {
      let media;
      if (file) { const up = await uploadGmbImage(file); media = [{ mediaFormat: "PHOTO" as const, sourceUrl: up.url }]; }
      await createGmbPost({ languageCode: "en", topicType: "STANDARD", summary: summary.trim(), media });
      setSummary(""); setFile(null); setOk("Post published."); refresh();
    } catch { setErr("Couldn’t publish the post."); } finally { setBusy(false); }
  }
  async function remove(name: string) {
    if (!confirm("Delete this post?")) return;
    try { await deleteGmbPost(name); refresh(); } catch { setErr("Couldn’t delete the post."); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Recent posts */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold">Recent posts</h3>
        {isLoading ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center text-ink-3">Loading…</div>
        ) : isError ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center text-danger">Couldn’t load posts.</div>
        ) : (posts?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-10 text-center text-ink-3">No posts yet.</div>
        ) : (
          posts!.map((p: GmbPost) => (
            <div key={p.name} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm">{p.summary || "(no text)"}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  {p.state && <Badge tone={p.state === "LIVE" || p.state === "PUBLISHED" ? "ok" : "default"}>{p.state}</Badge>}
                  <span className="text-xs text-ink-3">{fmt(p.createTime)}</span>
                </div>
              </div>
              <button onClick={() => remove(p.name)} aria-label="Delete post"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-[var(--danger-soft)] hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="h-fit rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-bold">New post</h3>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} placeholder="What’s happening at your store?"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
        <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">
          <ImageIcon className="h-4 w-4" /> {file ? file.name : "Add a photo (optional)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {err && <div className="mt-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-sm font-medium text-danger">{err}</div>}
        {ok && <div className="mt-3 rounded-md bg-[var(--ok-soft)] px-3 py-2 text-sm font-medium text-ok">{ok}</div>}
        <Button variant="primary" className="mt-3 w-full justify-center" onClick={publish} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publish
        </Button>
      </div>
    </div>
  );
}
