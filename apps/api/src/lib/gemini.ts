import Groq from "groq-sdk";

let groq: Groq | null = null;

export function initGroq(apiKey: string) {
  groq = new Groq({ apiKey });
}

export function reinitGroq(apiKey: string) {
  groq = new Groq({ apiKey });
  console.log("[groq] API key updated");
}

export async function queryGroq(prompt: string, opts?: { jsonMode?: boolean; maxTokens?: number }): Promise<string> {
  if (!groq) {
    throw new Error(
      "Groq API key not configured. " +
        "Set GROQ_API_KEY in apps/api/.env"
    );
  }

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: opts?.jsonMode
          ? "You are a JSON API. Respond ONLY with valid JSON. No markdown, no explanations."
          : "You are a helpful assistant.",
      },
      { role: "user", content: prompt },
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: opts?.maxTokens ?? 600,
    ...(opts?.jsonMode ? { response_format: { type: "json_object" } } : {}),
  });

  return completion.choices[0]?.message?.content ?? "";
}
