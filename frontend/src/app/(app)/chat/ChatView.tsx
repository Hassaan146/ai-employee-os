"use client";

/**
 * Assistant chat — the interface for the five agents in ai/app/agents/.
 *
 * Speaks the contract from ai/plan.md:
 *   POST /chat  { message, session_id, agent }  ->  { response, tool_calls }
 *
 * The agents and their tool-calling loop exist; the HTTP endpoint does not
 * yet, so replies currently come back flagged as preview. Tool calls are
 * rendered because BaseAgent.handle() already returns them — the panel will
 * light up the moment the endpoint is wired.
 */

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Textarea,
  cn,
} from "@/components/ui/primitives";
import { IconRobot, IconSend, IconTool } from "@/components/ui/icons";
import { CHAT_AGENTS, getSessionId, sendChatMessage } from "@/lib/api/chat";
import type { AIRoleType, ChatMessage } from "@/lib/types";

/** Starter prompts per agent, drawn from the use cases in EmployeeOS.md. */
const SUGGESTIONS: Record<AIRoleType, string[]> = {
  executive: [
    "Send a quotation to John for 25 laptops and schedule a meeting Friday at 3 PM.",
    "Summarise what needs my attention this week.",
  ],
  sales: [
    "What open deals does John have?",
    "Draft a follow-up for customers who haven't replied in three days.",
  ],
  support: [
    "A customer says their order hasn't arrived. What should I tell them?",
    "Summarise the most common support issues this month.",
  ],
  finance: [
    "Which invoices are overdue?",
    "Create an invoice for Smith Traders for 25 laptops.",
  ],
  hr: [
    "What is our annual leave policy?",
    "Draft an onboarding checklist for a new sales hire.",
  ],
  accountant: [],
  marketing: [],
  legal: [],
};

export function ChatView() {
  const [agent, setAgent] = useState<AIRoleType>("executive");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeAgent = CHAT_AGENTS.find((a) => a.id === agent) ?? CHAT_AGENTS[0];

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await sendChatMessage(
        { message: trimmed, session_id: getSessionId(), agent },
        activeAgent.label,
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          agent,
          content: res.data.response,
          toolCalls: res.data.tool_calls ?? [],
          createdAt: new Date().toISOString(),
          preview: res.source === "preview",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "agent",
          agent,
          content: `Request failed: ${err instanceof Error ? err.message : "unknown error"}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="grid h-[calc(100vh-7.5rem)] gap-5 lg:grid-cols-[16rem_1fr]">
      {/* ---------------------------- Agent list --------------------------- */}
      <Card className="hidden overflow-y-auto lg:block">
        <CardHeader title="AI employees" description="Agents with a live implementation." />
        <CardBody className="space-y-1.5">
          {CHAT_AGENTS.map((a) => {
            const active = a.id === agent;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAgent(a.id)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                  active
                    ? "border-accent/40 bg-accent/[0.08]"
                    : "border-transparent hover:border-line hover:bg-surface-2/60",
                )}
              >
                <IconRobot
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active ? "text-accent" : "text-ink-faint",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-xs font-medium",
                      active ? "text-accent" : "text-ink",
                    )}
                  >
                    {a.label}
                  </span>
                  <span className="block truncate text-[11px] text-ink-faint">
                    {a.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </CardBody>
      </Card>

      {/* ------------------------------ Thread ----------------------------- */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <IconRobot className="size-4 text-accent" />
              {activeAgent.label}
            </span>
          }
          description={activeAgent.blurb}
          action={
            <div className="flex items-center gap-2">
              <Badge tone="warn">POST /chat pending</Badge>
              {messages.length > 0 ? (
                <Button variant="ghost" onClick={() => setMessages([])}>
                  Clear
                </Button>
              ) : null}
            </div>
          }
        />

        {/* Mobile agent switcher */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-line-soft px-5 py-2.5 lg:hidden">
          {CHAT_AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAgent(a.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] transition",
                a.id === agent
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-line text-ink-muted",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
              <div className="grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-accent">
                <IconRobot className="size-5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-ink">
                  Assign work to the {activeAgent.label}
                </p>
                <p className="mx-auto max-w-md text-xs leading-relaxed text-ink-muted">
                  Describe a task in plain language. The agent decides which tools
                  it needs, calls them, and reports back.
                </p>
              </div>
              <div className="flex w-full max-w-lg flex-col gap-2">
                {(SUGGESTIONS[agent] ?? []).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="rounded-lg border border-line-soft bg-canvas/60 px-3.5 py-2.5 text-left text-[11px] leading-relaxed text-ink-muted transition hover:border-accent/30 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}

          {pending ? (
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-accent" />
              </span>
              {activeAgent.label} is working…
            </div>
          ) : null}
        </div>

        {/* ---------------------------- Composer --------------------------- */}
        <div className="border-t border-line-soft px-5 py-3.5">
          <div className="flex items-end gap-2.5">
            <Textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask the ${activeAgent.label} to do something…`}
              aria-label="Message"
              className="flex-1"
            />
            <Button
              variant="primary"
              onClick={() => void send(input)}
              disabled={!input.trim() || pending}
              className="h-10"
            >
              <IconSend className="size-3.5" />
              Send
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-ink-faint">
            Enter to send · Shift+Enter for a new line · session{" "}
            <code className="font-mono">{getSessionId().slice(0, 12)}…</code>
          </p>
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------- Message bubble --------------------------- */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex animate-fade-up gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <div className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-accent">
          <IconRobot className="size-3.5" />
        </div>
      ) : null}

      <div className={cn("min-w-0 max-w-[80%] space-y-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-accent text-accent-ink"
              : "border border-line-soft bg-canvas/60 text-ink",
          )}
        >
          {message.content}
        </div>

        {message.preview ? (
          <Badge tone="warn">Preview reply — endpoint not live</Badge>
        ) : null}

        {message.toolCalls && message.toolCalls.length > 0 ? (
          <div className="space-y-1.5">
            {message.toolCalls.map((call, i) => (
              <details
                key={`${call.tool}-${i}`}
                className="rounded-lg border border-line-soft bg-surface-2/50 px-3 py-2"
              >
                <summary className="flex cursor-pointer items-center gap-2 text-[11px] text-ink-muted">
                  <IconTool className="size-3.5 text-accent" />
                  Called{" "}
                  <code className="font-mono text-ink">{call.tool}</code>
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border border-line-soft bg-canvas px-2.5 py-2 font-mono text-[10px] leading-relaxed text-ink-muted">
                  {JSON.stringify({ args: call.args, result: call.result }, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        ) : null}

        <p className={cn("text-[10px] text-ink-faint", isUser && "text-right")}>
          {new Date(message.createdAt).toLocaleTimeString()}
        </p>
      </div>

      {isUser ? (
        <div className="grid size-7 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent/10 text-[10px] font-semibold text-accent">
          AO
        </div>
      ) : null}
    </div>
  );
}
