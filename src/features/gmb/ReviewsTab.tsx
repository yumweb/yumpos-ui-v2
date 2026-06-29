import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Loader2, RefreshCw, Sparkles, Trash2, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/primitives";
import {
  useGmbReviews, syncGmbReviews, replyGmbReview, deleteGmbReply, aiReplyGmbReview, bulkAiReplyGmb,
  type GmbReview,
} from "./api";

const LIMIT = 20;
const fmt = (raw?: string) => raw ? new Date(raw).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";

function Stars({ n = 0 }: { n?: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("h-4 w-4", i <= n ? "fill-warn text-warn" : "text-ink-3")} />
      ))}
    </span>
  );
}

export function ReviewsTab() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { data, isLoading, isError } = useGmbReviews(page, LIMIT, true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [note, setNote] = useState("");

  const reviews = data?.reviews ?? [];
  const total = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / LIMIT));

  // Seed drafts from existing replies.
  useEffect(() => {
    setDrafts((d) => {
      const next = { ...d };
      for (const r of reviews) if (next[r.reviewId] === undefined) next[r.reviewId] = r.reviewReplyComment ?? "";
      return next;
    });
  }, [reviews]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["gmb-reviews"] });

  async function sync() {
    setSyncing(true); setNote("");
    try { const r = await syncGmbReviews(); setNote(r?.message || "Sync started — refreshing shortly."); setTimeout(refresh, 2500); }
    catch { setNote("Sync failed."); } finally { setSyncing(false); }
  }
  async function bulkAi() {
    setSyncing(true); setNote("");
    try { const r = await bulkAiReplyGmb(); setNote(r?.message || "Bulk AI replies started."); setTimeout(refresh, 2500); }
    catch { setNote("Bulk AI reply failed."); } finally { setSyncing(false); }
  }
  async function aiSuggest(id: string) {
    setAiBusy(id);
    try { const r = await aiReplyGmbReview(id); setDrafts((d) => ({ ...d, [id]: r.reply })); }
    catch { setNote("Couldn’t generate an AI reply."); } finally { setAiBusy(null); }
  }
  async function postReply(id: string) {
    setSaveBusy(id);
    try { await replyGmbReview(id, drafts[id] ?? ""); refresh(); }
    catch { setNote("Couldn’t post the reply."); } finally { setSaveBusy(null); }
  }
  async function removeReply(id: string) {
    setSaveBusy(id);
    try { await deleteGmbReply(id); setDrafts((d) => ({ ...d, [id]: "" })); refresh(); }
    catch { setNote("Couldn’t delete the reply."); } finally { setSaveBusy(null); }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default" onClick={sync} disabled={syncing}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync reviews</Button>
        <Button variant="default" onClick={bulkAi} disabled={syncing}><Sparkles className="h-4 w-4" /> AI-reply all unanswered</Button>
        {note && <span className="text-sm text-ink-2">{note}</span>}
        <div className="flex-1" />
        <span className="text-sm text-ink-3">{total.toLocaleString("en-IN")} reviews</span>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">Loading…</div>
      ) : isError ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-danger">Couldn’t load reviews.</div>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center text-ink-3">No reviews yet. Try “Sync reviews”.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r: GmbReview) => {
            const hasReply = !!r.reviewReplyComment;
            return (
              <div key={r.reviewId} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start gap-3">
                  {r.reviewerProfilePhotoUrl ? (
                    <img src={r.reviewerProfilePhotoUrl} alt="" className="h-9 w-9 rounded-full" />
                  ) : (
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-sm font-bold text-ink-2">{(r.reviewerDisplayName ?? "A")[0]}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.reviewerDisplayName || "Anonymous"}</span>
                      <Stars n={r.starRating} />
                      <span className="text-xs text-ink-3">{fmt(r.createTime)}</span>
                      {hasReply && <span className="rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11px] font-semibold text-ok">Replied{r.repliedByAi ? " · AI" : ""}</span>}
                    </div>
                    {r.comment && <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{r.comment}</p>}

                    <div className="mt-3">
                      <textarea value={drafts[r.reviewId] ?? ""} onChange={(e) => setDrafts((d) => ({ ...d, [r.reviewId]: e.target.value }))}
                        rows={2} placeholder="Write a reply…"
                        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button variant="default" onClick={() => aiSuggest(r.reviewId)} disabled={aiBusy === r.reviewId}>
                          {aiBusy === r.reviewId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI suggest
                        </Button>
                        <Button variant="primary" onClick={() => postReply(r.reviewId)} disabled={saveBusy === r.reviewId || !(drafts[r.reviewId] ?? "").trim()}>
                          {saveBusy === r.reviewId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {hasReply ? "Update reply" : "Post reply"}
                        </Button>
                        {hasReply && (
                          <Button variant="default" onClick={() => removeReply(r.reviewId)} disabled={saveBusy === r.reviewId}>
                            <Trash2 className="h-4 w-4" /> Delete reply
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {maxPage > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="default" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
              <span className="text-sm text-ink-3">Page {page} of {maxPage}</span>
              <Button variant="default" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
