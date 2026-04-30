export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url" | "input_audio" | "document";
  text?: string;
  image_url?: { url: string };
  input_audio?: { data: string; format: string };
  document?: { type: string; source: { type: string; url?: string; data?: string } };
}

export interface ChatParams {
  model: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export async function streamChat(
  baseUrl: string,
  apiKey: string,
  messages: ChatMessage[],
  params: ChatParams,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void
): Promise<void> {
  // To avoid CORS, force the Hackclub AI proxy to use the local rewrite
  const safeBaseUrl = baseUrl === "https://ai.hackclub.com/proxy/v1" ? "/proxy" : baseUrl;
  const url = `${safeBaseUrl}/chat/completions`;
  let fullText = "";

  try {
    if (!params.stream) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ ...params, messages, stream: false }),
      });
      if (!res.ok) {
        const errText = await res.text();
        onError(`API error ${res.status}: ${errText}`);
        return;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      onDone(content);
      return;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...params,
        messages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`API error ${res.status}: ${errText}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError("No response body"); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(fullText); return; }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            fullText += delta;
            onChunk(fullText);
          }
        } catch {
          // skip malformed lines
        }
      }
    }
    onDone(fullText);
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

export async function streamReplicate(
  apiKey: string,
  model: string,
  input: any,
  onChunk: (event: any) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const res = await fetch("/api/replicate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input, stream: true }),
    });

    if (!res.ok) {
      const errText = await res.text();
      onError(`Replicate error ${res.status}: ${errText}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError("No response body"); return; }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { onDone(); return; }
        try {
          const parsed = JSON.parse(data);
          onChunk(parsed);
        } catch {
          // skip malformed
        }
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
  }
}

export async function generateImage(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  model: string,
  size?: string
): Promise<string> {
  const safeBaseUrl = baseUrl === "https://ai.hackclub.com/proxy/v1" ? "/proxy" : baseUrl;
  
  // OpenRouter/Hack Club AI uses chat completions for image generation models
  const res = await fetch(`${safeBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ 
      model, 
      messages: [{ role: "user", content: prompt }]
    }),
  });

  if (!res.ok) {
    const errorData = await res.text();
    throw new Error(`Image Gen API Error: ${res.status} ${errorData}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No text content received. Raw response: " + JSON.stringify(data));
  }

  // OpenRouter models often return the image URL directly or in markdown format: ![image](url)
  const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/.*?)\)/);
  if (markdownMatch && markdownMatch[1]) {
    return markdownMatch[1];
  }

  // If it's a data URL or raw base64 that looks like an image
  if (content.startsWith("data:image") || content.length > 1000) {
    return content.trim();
  }

  // If it's just a raw URL
  if (content.trim().startsWith("http")) {
    return content.trim();
  }

  // Otherwise, return the content as is
  return content;
}

export async function generateEmbedding(
  baseUrl: string,
  apiKey: string,
  input: string,
  model: string
): Promise<number[]> {
  const safeBaseUrl = baseUrl === "https://ai.hackclub.com/proxy/v1" ? "/proxy" : baseUrl;
  const res = await fetch(`${safeBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input }),
  });
  if (!res.ok) throw new Error(`Embedding failed: ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.embedding ?? [];
}

export async function fetchModels(baseUrl: string, apiKey: string) {
  const safeBaseUrl = baseUrl === "https://ai.hackclub.com/proxy/v1" ? "/proxy" : baseUrl;
  const res = await fetch(`${safeBaseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
