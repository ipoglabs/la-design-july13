"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ─── Static mock chat history ──────────────────────────────────────────────
 * TODO [INTEGRATION]: Replace MOCK_MESSAGES with a real fetch:
 *   const messages = await fetchMessages(listingId, userId)
 * TODO [INTEGRATION]: Add `listingId: string` and `currentUserId: string` props
 *   and pass them down from the parent page when wiring to the real API.
 * TODO [INTEGRATION]: Auto-scroll to latest message on load and on new message:
 *   ref the messages container and call scrollTop = scrollHeight in a useEffect
 * ─────────────────────────────────────────────────────────────────────────── */
const MOCK_MESSAGES = [
  { id: 1, from: "me",     text: "Hey, is this still available?" },
  { id: 2, from: "seller", text: "Yes it is! When would you like to visit?" },
  { id: 3, from: "me",     text: "Could we schedule this Saturday morning?" },
];

export default function ChitChat({ className }: { className?: string }) {
  const [message, setMessage] = React.useState("");

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    // TODO [INTEGRATION]: POST message to /api/chat/{listingId} and update message list.
    setMessage("");
  }

  return (
    <section
      className={cn(
        "bg-white px-4 py-5",
        "border-y border-slate-200 sm:rounded-xl sm:border sm:shadow-sm",
        "flex flex-col gap-4",
        className,
      )}
    >
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ChitChat</h2>
        <p className="text-sm text-slate-500 mt-0.5">Don't worry this is private message to owner.</p>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto max-h-64 bg-slate-100 rounded-xl px-4 py-4 flex flex-col gap-3">
        {MOCK_MESSAGES.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.from === "me" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[80%]",
                msg.from === "me"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm",
              )}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border border-slate-300 rounded-xl py-2.5 px-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={!message.trim()}
          aria-label="Send message"
          className="shrink-0 size-10 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M4.4 19.425q-.5.2-.95-.088T3 18.5V14l8-2-8-2V5.5q0-.55.45-.837t.95-.088l15.4 6.5q.625.275.625.925t-.625.925z" />
          </svg>
        </button>
      </form>
    </section>
  );
}
