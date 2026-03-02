import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  onSend: (message: string) => Promise<string>;
};

const suggestions = [
  "Generate shopping list from my recipes",
  "What ingredient mappings are missing?",
  "Add mapped items to Kroger cart"
];

export function AgentChatPage({ onSend }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    try {
      const response = await onSend(text);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    } catch (e: any) {
      setError(e?.message || "Agent failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Agent Chat</h2>
      <div className="rounded-xl bg-white p-4 shadow">
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs" onClick={() => submit(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>
        <div className="h-72 space-y-2 overflow-y-auto rounded border p-2">
          {messages.length === 0 && <p className="text-sm text-slate-500">Ask the agent to generate lists, clarify details, or suggest missing mappings.</p>}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
              <span className={m.role === "user" ? "inline-block rounded bg-brand-500 px-3 py-1 text-sm text-white" : "inline-block rounded bg-slate-200 px-3 py-1 text-sm"}>
                {m.content}
              </span>
            </div>
          ))}
          {loading && <p className="text-sm text-slate-500">Thinking...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            await submit(input);
          }}
        >
          <input className="flex-1 rounded border p-2" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message" />
          <button className="rounded bg-brand-500 px-4 py-2 text-white" disabled={loading}>
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
