'use client'
import { FormEvent, useCallback, useState } from "react";

export default function Home() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [inflight, setInflight] = useState(false);
  const onSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Prevent multiple requests at once
      if (inflight) return;

      // Reset output
      setInflight(true);
      setOutput('');

      try {
        const res = await fetch(`/api/babyagi`, {
          method: 'POST',
          body: JSON.stringify({ input }),
        });
        const data = await res.json();
        setOutput(data.text);
        setInput('');

      } catch (error) {
        console.error(error);
      } finally {
        setInflight(false);
      }
    },[inflight, input]
  );

  return (
    <main className="max-w-lg p-6 lg:p-20 mx-auto">
      <form onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Ask..."
          value={input}
          className="border py-2"
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="border px-2 py-1 rounded text-white bg-black">
          Ask
        </button>
      </form>
      <div style={{ width: 500 }}>Response: {output}</div>
    </main>
  )
}
