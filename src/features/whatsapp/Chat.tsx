import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Inbox, Archive, User, MoreVertical, Send, Clock, Check, CheckCheck,
  AlertCircle, MessageSquare, Loader2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { getLocation } from "@/lib/auth";
import { Button, Badge } from "@/components/ui/primitives";
import { Modal, FieldRow, fieldCls } from "@/components/Modal";
import { WaGate } from "./WaGate";
import {
  getConversations, getUnreadCount, getMessages, sendChatMessage, startConversation, markRead, archiveConversation,
  useApprovedTemplates, type Conversation, type ChatMessage, type MessagesResponse,
} from "./api";

/* ── formatters ── */
const relTime = (d?: string) => {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000), h = Math.floor(ms / 3.6e6), days = Math.floor(ms / 8.64e7);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (days === 1) return "Yesterday";
  if (days < 7) return new Date(d).toLocaleDateString(undefined, { weekday: "short" });
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
const clockTime = (d?: string) => d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const dayLabel = (d?: string) => {
  if (!d) return "";
  const x = new Date(d), today = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
  if (x.toDateString() === today.toDateString()) return "TODAY";
  if (x.toDateString() === y.toDateString()) return "YESTERDAY";
  return x.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).toUpperCase();
};
const fmtPhone = (p?: string) => {
  if (!p) return "";
  const c = p.replace(/\D/g, "");
  return c.length === 12 && c.startsWith("91") ? `+${c.slice(0, 2)} ${c.slice(2, 7)} ${c.slice(7)}` : p;
};
const remaining = (ms: number) => {
  if (!ms || ms <= 0) return "Expired";
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function StatusIcon({ status }: { status?: string }) {
  if (status === "pending") return <Clock className="h-3.5 w-3.5 text-ink-3" />;
  if (status === "sent") return <Check className="h-3.5 w-3.5 text-ink-3" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 text-ink-3" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-brand" />;
  if (status === "failed") return <AlertCircle className="h-3.5 w-3.5 text-danger" />;
  return null;
}

export function Chat() {
  return <WaGate><ChatInner /></WaGate>;
}

function ChatInner() {
  const location = getLocation();
  const { data: templates = [] } = useApprovedTemplates();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"my-chats" | "archived">("my-chats");
  const [unread, setUnread] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [data, setData] = useState<MessagesResponse | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newTpl, setNewTpl] = useState("");
  const [starting, setStarting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialRef = useRef(true);

  const loadConversations = useCallback(async () => {
    try {
      const r = await getConversations({ status: "all", search, page: 1, limit: 100 });
      setConversations(r.conversations ?? []);
    } catch { /* advisory */ } finally { setLoading(false); }
  }, [search]);
  const loadCounts = useCallback(async () => { try { setUnread((await getUnreadCount()).unreadCount ?? 0); } catch { /* advisory */ } }, []);

  useEffect(() => {
    setLoading(true); loadConversations(); loadCounts();
    const i = setInterval(() => { loadConversations(); loadCounts(); }, 30000);
    return () => clearInterval(i);
  }, [loadConversations, loadCounts]);

  const loadMessages = useCallback(async (markAsRead: boolean) => {
    if (!selectedId) return;
    try {
      const r = await getMessages(selectedId);
      setData(r);
      if (markAsRead) { await markRead(selectedId).catch(() => {}); loadConversations(); loadCounts(); }
    } catch { setError("Couldn’t load messages."); }
  }, [selectedId, loadConversations, loadCounts]);

  useEffect(() => {
    if (!selectedId) return;
    setMsgLoading(true); setError(null); initialRef.current = true;
    loadMessages(true).finally(() => setMsgLoading(false));
    const i = setInterval(() => loadMessages(false), 10000);
    return () => clearInterval(i);
  }, [selectedId, loadMessages]);

  // scroll to bottom on new messages
  useEffect(() => {
    if (msgLoading || !data?.messages.length) return;
    requestAnimationFrame(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; });
  }, [msgLoading, data?.messages.length]);

  const shown = useMemo(
    () => conversations.filter((c) => tab === "archived" ? c.status === "archived" : c.status !== "archived"),
    [tab, conversations]
  );
  const grouped = useMemo(() => {
    const g: Record<string, ChatMessage[]> = {};
    (data?.messages ?? []).filter((m) => m.mediaUrl || m.content?.trim()).forEach((m) => {
      const k = dayLabel(m.timestamp); (g[k] ??= []).push(m);
    });
    return g;
  }, [data?.messages]);

  const within = data?.isWithin24HourWindow ?? false;
  const conv = data?.conversation ?? null;

  async function send() {
    if (!input.trim() || sending) return;
    if (!within) { setTplOpen(true); return; }
    setSending(true);
    try { await sendChatMessage(selectedId!, { type: "text", content: input.trim() }); setInput(""); loadMessages(false); loadConversations(); }
    catch (e) { setError((e as Error)?.message || "Failed to send."); }
    finally { setSending(false); }
  }
  async function sendTemplate() {
    if (!tpl || sending) return;
    setSending(true);
    try { await sendChatMessage(selectedId!, { type: "template", templateName: tpl, templateLanguage: "en" }); setTplOpen(false); setTpl(""); loadMessages(false); loadConversations(); }
    catch (e) { setError((e as Error)?.message || "Failed to send template."); }
    finally { setSending(false); }
  }
  async function archive() {
    setMenuOpen(false);
    try { await archiveConversation(selectedId!); setSelectedId(null); setData(null); loadConversations(); }
    catch { setError("Couldn’t archive."); }
  }
  async function startNew() {
    if (!newPhone.trim() || !newTpl || starting) return;
    let phone = newPhone.replace(/\D/g, "");
    if (phone.length === 10) phone = "91" + phone;
    const variables: Record<string, string[]> = {};
    if (newTpl.startsWith("ice_breaker")) { variables.header = [location?.locationName ?? location?.name ?? "Our Business"]; variables.body = ["there"]; }
    setStarting(true);
    try {
      const r = await startConversation({ customerPhone: phone, templateName: newTpl, templateLanguage: "en", variables: Object.keys(variables).length ? variables : undefined });
      setNewOpen(false); setNewPhone(""); setNewTpl(""); loadConversations();
      if (r?.id) setSelectedId(r.id);
    } catch (e) { setError((e as Error)?.message || "Couldn’t start conversation."); }
    finally { setStarting(false); }
  }

  return (
    <div className="flex h-[calc(100vh-66px-3rem)] overflow-hidden rounded-lg border border-border bg-surface shadow-sm2">
      {/* Left: conversation list */}
      <div className="flex w-[340px] min-w-[340px] flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-bold">Chats</h2>
          <button onClick={() => setNewOpen(true)} title="Start new chat" className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2"><Plus className="h-5 w-5" /></button>
        </div>
        <div className="flex border-b border-border">
          {([["my-chats", "My Chats", Inbox], ["archived", "Archived", Archive]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={cn("flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-sm font-semibold", tab === id ? "border-brand text-brand" : "border-transparent text-ink-3 hover:text-ink")}>
              <Icon className="h-4 w-4" /> {label}
              {id === "my-chats" && unread > 0 && <Badge tone="brand">{unread > 99 ? "99+" : unread}</Badge>}
            </button>
          ))}
        </div>
        <div className="border-b border-border p-2">
          <label className="flex items-center gap-2 rounded-md bg-surface-2 px-2.5 py-1.5">
            <Search className="h-4 w-4 text-ink-3" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search or start new chat" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
          </label>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>
          ) : shown.length === 0 ? (
            <div className="py-12 text-center text-ink-3"><MessageSquare className="mx-auto mb-2 h-12 w-12 opacity-30" /><p className="text-sm">{tab === "archived" ? "No archived chats" : "No conversations yet"}</p></div>
          ) : shown.map((c) => (
            <button key={c.id} onClick={() => setSelectedId(c.id)} className={cn("flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left hover:bg-surface-2", selectedId === c.id && "bg-surface-2")}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3"><User className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", c.unreadCount ? "font-bold text-ink" : "font-medium text-ink")}>{c.customerName || fmtPhone(c.customerPhone)}</span>
                  <span className={cn("shrink-0 text-xs", c.unreadCount ? "font-semibold text-brand" : "text-ink-3")}>{relTime(c.lastMessageAt)}</span>
                </span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-ink-3">{c.customerName ? fmtPhone(c.customerPhone) : ""}</span>
                  {c.unreadCount > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-brand-fg">{c.unreadCount > 99 ? "99+" : c.unreadCount}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: messages */}
      {selectedId && conv ? (
        <div className="flex flex-1 flex-col bg-surface-2">
          <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-ink-3"><User className="h-5 w-5" /></span>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">{conv.customerName || fmtPhone(conv.customerPhone)}</div>
              {conv.customerName && <div className="text-xs text-ink-3">{fmtPhone(conv.customerPhone)}</div>}
            </div>
            <Badge tone={within ? "ok" : "warn"}><Clock className="h-3 w-3" /> {within ? `${remaining(data!.windowRemainingMs)} left` : "Window expired"}</Badge>
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="grid h-8 w-8 place-items-center rounded-md text-ink-2 hover:bg-surface-2"><MoreVertical className="h-5 w-5" /></button>
              {menuOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[140px] rounded-md border border-border bg-surface p-1 shadow-soft">
                  <button onClick={archive} className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-2 hover:bg-surface-2">Archive chat</button>
                </div>
              )}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
            {msgLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-ink-3" /></div>
            ) : (
              <>
                {error && <div className="mb-3 rounded-md bg-[var(--danger-soft)] px-3 py-2 text-center text-sm text-danger">{error}</div>}
                {Object.entries(grouped).map(([day, msgs]) => (
                  <div key={day}>
                    <div className="my-3 flex justify-center"><span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-3 shadow-sm2">{day}</span></div>
                    {msgs.map((m) => (
                      <div key={m.id} className={cn("mb-1.5 flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[65%] rounded-lg px-3 py-2 text-sm shadow-sm2", m.direction === "outbound" ? "bg-brand-100 text-ink" : "bg-surface text-ink")}>
                          {m.messageType === "image" && m.mediaUrl ? (
                            <img src={m.mediaUrl} alt="" className="mb-1 max-h-72 max-w-full cursor-pointer rounded-md" onClick={() => window.open(m.mediaUrl, "_blank")} />
                          ) : m.messageType === "video" && m.mediaUrl ? (
                            <video src={m.mediaUrl} controls className="mb-1 max-h-72 max-w-full rounded-md" />
                          ) : m.messageType === "audio" && m.mediaUrl ? (
                            <audio src={m.mediaUrl} controls className="w-full max-w-[250px]" />
                          ) : m.messageType === "document" && m.mediaUrl ? (
                            <button onClick={() => window.open(m.mediaUrl, "_blank")} className="flex items-center gap-2 rounded-md bg-surface-2 px-2 py-1 text-left">{m.content || "Document"}</button>
                          ) : null}
                          {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            <span className="text-[11px] text-ink-3">{clockTime(m.timestamp)}</span>
                            {m.direction === "outbound" && <StatusIcon status={m.status} />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border bg-surface px-3 py-2.5">
            <textarea
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={sending || !within} rows={1}
              placeholder={within ? "Type a message" : "Window expired — send a template to reopen"}
              className="max-h-28 flex-1 resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand disabled:bg-surface-2"
            />
            <button onClick={within ? send : () => setTplOpen(true)} disabled={sending || (within && !input.trim())} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-brand-fg hover:bg-brand-600 disabled:opacity-50">
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-surface-2 text-center">
          <MessageSquare className="mb-3 h-16 w-16 text-ink-3 opacity-30" />
          <p className="text-lg font-light text-ink-2">Select a chat to start messaging</p>
        </div>
      )}

      {/* Template dialog (window expired) */}
      <Modal open={tplOpen} onClose={() => setTplOpen(false)} title="Send template message">
        <div className="space-y-3 p-5">
          <p className="text-sm text-ink-2">The 24-hour window has expired. You can only send an approved template message to reopen the conversation.</p>
          <FieldRow label="Template">
            <select value={tpl} onChange={(e) => setTpl(e.target.value)} className={fieldCls}>
              <option value="">Select a template</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.category})</option>)}
            </select>
          </FieldRow>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => setTplOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={sendTemplate} disabled={!tpl || sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send</Button>
        </div>
      </Modal>

      {/* New conversation dialog */}
      <Modal open={newOpen} onClose={() => { setNewOpen(false); setNewPhone(""); setNewTpl(""); }} title="Start new conversation">
        <div className="space-y-3 p-5">
          <p className="text-sm text-ink-2">Enter the customer’s phone number and select a template. The customer must reply to open a 24-hour messaging window.</p>
          <FieldRow label="Phone"><input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className={fieldCls} placeholder="e.g., 9876543210 or +91 98765 43210" /></FieldRow>
          <FieldRow label="Template">
            <select value={newTpl} onChange={(e) => setNewTpl(e.target.value)} className={fieldCls}>
              <option value="">Select a template</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name} ({t.category})</option>)}
            </select>
          </FieldRow>
          {templates.length === 0 && <p className="text-xs text-danger">No approved templates available. Create and get a template approved first.</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={() => { setNewOpen(false); setNewPhone(""); setNewTpl(""); }}>Cancel</Button>
          <Button variant="primary" onClick={startNew} disabled={!newPhone.trim() || !newTpl || starting}>{starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send template</Button>
        </div>
      </Modal>
    </div>
  );
}
