"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export function AiInput() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const data = await apiFetch<{ response: string }>("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (data?.response) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Ошибка: не удалось получить ответ от Groq" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.length > 0 && (
        <div
          ref={listRef}
          className="flex max-h-[200px] flex-col gap-2 overflow-y-auto rounded-lg border border-zinc-800 bg-surface-2 p-3"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2 text-[12px] leading-relaxed ${
                m.role === "assistant" ? "text-zinc-200" : "text-zinc-400"
              }`}
            >
              <span className="flex-shrink-0 font-mono text-[10px] text-zinc-600">
                {m.role === "assistant" ? "AI" : "Ты"}
              </span>
              <span>{m.text}</span>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 text-[12px] text-zinc-500">
              <span className="flex-shrink-0 font-mono text-[10px] text-zinc-600">AI</span>
              <span className="animate-pulse">...</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-[7px]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder='Спроси AI о своих данных — "Сколько я трачу на подписки?"'
          className="flex-1 rounded-lg border border-zinc-700/50 bg-surface px-3.5 py-[9px] font-sans text-[12.5px] text-zinc-200 outline-none transition placeholder:text-zinc-500 focus:border-accent"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-indigo-500/30 bg-accent-bg text-[13px] text-accent-light transition hover:bg-[rgba(123,111,240,0.14)] disabled:opacity-40"
        >
          →
        </button>
      </div>
    </div>
  );
}
