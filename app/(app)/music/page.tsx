"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Music as MusicIcon } from "lucide-react";
import { REPLICATE_MODELS } from "@/lib/models";

export default function MusicPage() {
  const { apiKey } = useUser();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !apiKey) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/replicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: REPLICATE_MODELS.music,
          input: { 
            prompt_b: prompt,
            // You can add more specific inputs for Lyria if needed
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAudioUrl(data.output);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><MusicIcon className="h-6 w-6 text-[var(--hc-accent)]"/> Music Generation</h1>
          <p className="text-sm text-muted-foreground">Generate music from text prompts using Google Lyria via Replicate.</p>
        </div>

        <div className="space-y-4">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A synthwave track with a driving bassline, retro drums, and an uplifting melody..."
            className="min-h-[120px] resize-none"
          />
          <Button onClick={handleGenerate} disabled={!prompt.trim() || isLoading || !apiKey}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MusicIcon className="mr-2 h-4 w-4" />}
            Generate Music
          </Button>
        </div>

        {audioUrl && (
          <Card className="p-6 bg-card/50">
            <audio controls src={audioUrl} className="w-full" />
          </Card>
        )}
      </div>
    </div>
  );
}
