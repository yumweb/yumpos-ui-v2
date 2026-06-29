import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, CornerDownRight, Send } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Badge } from "@/components/ui/primitives";
import { useTicketDetail, useAddTicketComment, useAddTicketReply, ticketTypeLabel } from "./api";

interface Feedback { id: number; ticketFeedback?: string; feedbackTime?: string; replyTo?: number | null; employee?: { person?: { firstName?: string; lastName?: string } } }
const who = (f: Feedback) => [f.employee?.person?.firstName, f.employee?.person?.lastName].filter(Boolean).join(" ").trim() || "Staff";
const when = (raw?: string) => raw ? new Date(raw).toLocaleString("en-IN", { day: "numeric", month: "short", year: "2-digit", hour: "numeric", minute: "2-digit" }) : "";

export function TicketDetailModal({ ticketId, onClose, onChanged }: {
  ticketId: number | null; onClose: () => void; onChanged: () => void;
}) {
  const open = ticketId != null;
  const qc = useQueryClient();
  const { data: t, isLoading } = useTicketDetail(ticketId, open);
  const addComment = useAddTicketComment();
  const addReply = useAddTicketReply();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");

  if (!open) return null;

  const refetch = () => { qc.invalidateQueries({ queryKey: ["ticket", ticketId] }); onChanged(); };
  const feedbacks = (t?.ticketFeedbacks ?? []) as Feedback[];
  const topLevel = feedbacks.filter((f) => f.replyTo == null);

  function postComment() {
    if (!comment.trim() || ticketId == null) return;
    addComment.mutate({ id: ticketId, comment: comment.trim() }, { onSuccess: () => { setComment(""); refetch(); } });
  }
  function postReply(commentId: number) {
    if (!reply.trim() || ticketId == null) return;
    addReply.mutate({ id: ticketId, commentId, reply: reply.trim() }, { onSuccess: () => { setReply(""); setReplyTo(null); refetch(); } });
  }

  return (
    <Modal open={open} onClose={onClose} title={`Ticket #${ticketId}`} width="max-w-[600px]">
      <div className="grid gap-4 p-5">
        {isLoading || !t ? (
          <div className="py-8 text-center text-ink-3">Loading…</div>
        ) : (
          <>
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-bold">{t.subject || "(no subject)"}</span>
                <Badge tone="default">{ticketTypeLabel(t.ticketType)}</Badge>
                {(t.closed || (t as Record<string, unknown>).isClosed) ? <Badge tone="ok">Closed</Badge> : <Badge tone="brand">Open</Badge>}
              </div>
              <p className="text-sm text-ink-2">{when(t.ticketTime)} · {t.location?.name ?? ""}</p>
              {t.message && <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold">Comments</h3>
              {topLevel.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-2 px-3 py-4 text-center text-sm text-ink-3">No comments yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topLevel.map((c) => {
                    const replies = feedbacks.filter((f) => f.replyTo === c.id);
                    return (
                      <div key={c.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{who(c)}</span>
                          <span className="text-xs text-ink-3">{when(c.feedbackTime)}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-2">{c.ticketFeedback}</p>

                        {replies.map((r) => (
                          <div key={r.id} className="mt-2 flex gap-2 border-l-2 border-border pl-3">
                            <CornerDownRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
                            <div>
                              <div className="flex items-center gap-2"><span className="text-sm font-semibold">{who(r)}</span><span className="text-xs text-ink-3">{when(r.feedbackTime)}</span></div>
                              <p className="whitespace-pre-wrap text-sm text-ink-2">{r.ticketFeedback}</p>
                            </div>
                          </div>
                        ))}

                        {replyTo === c.id ? (
                          <div className="mt-2 flex items-end gap-2">
                            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…"
                              className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand" />
                            <Button type="button" variant="primary" onClick={() => postReply(c.id)} disabled={addReply.isPending || !reply.trim()}>
                              {addReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
                            </Button>
                            <Button type="button" variant="default" onClick={() => { setReplyTo(null); setReply(""); }}>Cancel</Button>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyTo(c.id); setReply(""); }} className="mt-2 text-xs font-semibold text-brand hover:underline">Reply</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 border-t border-border pt-3">
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…"
                className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <Button type="button" variant="primary" onClick={postComment} disabled={addComment.isPending || !comment.trim()}>
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Comment
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
