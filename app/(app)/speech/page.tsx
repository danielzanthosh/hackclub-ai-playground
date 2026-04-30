"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Play, Mic, Upload } from "lucide-react";
import { REPLICATE_MODELS } from "@/lib/models";

export default function SpeechPage() {
  const { apiKey } = useUser();
  const [ttsInput, setTtsInput] = useState("");
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleTts = async () => {
    if (!ttsInput.trim() || !apiKey) return;
    setIsTtsLoading(true);
    setError("");
    try {
      // Use OpenRouter via HC Proxy with the openai/gpt-audio model
      const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-audio",
          messages: [{ role: "user", content: ttsInput }],
          modalities: ["text", "audio"],
          audio: { voice: "alloy", format: "mp3" }
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Speech Gen API Error: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      const audioData = data.choices?.[0]?.message?.audio?.data;
      
      if (!audioData) {
        throw new Error("No audio data returned from the model.");
      }
      
      // Convert base64 to data URL
      setTtsAudioUrl(`data:audio/mp3;base64,${audioData}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setIsTtsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><Mic className="h-6 w-6 text-[var(--hc-accent)]"/> Speech Tools</h1>
          <p className="text-sm text-muted-foreground">Text-to-Speech (TTS) and Speech-to-Text (STT) powered by Replicate.</p>
        </div>

        <Tabs defaultValue="tts" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="tts">Text to Speech</TabsTrigger>
            <TabsTrigger value="stt">Speech to Text</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tts" className="space-y-6">
            <Textarea
              value={ttsInput}
              onChange={(e) => setTtsInput(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="min-h-[120px] resize-none"
            />
            <Button onClick={handleTts} disabled={!ttsInput.trim() || isTtsLoading || !apiKey}>
              {isTtsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Generate Speech
            </Button>

            {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">{error}</div>}

            {ttsAudioUrl && (
              <Card className="p-6 bg-card/50">
                <audio controls src={ttsAudioUrl} className="w-full" />
              </Card>
            )}
          </TabsContent>

          <TabsContent value="stt" className="space-y-6">
            <Card className="border-dashed bg-card/30 min-h-[200px] flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-card/50 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Click to upload audio file</p>
              <p className="text-xs text-muted-foreground mt-1">or drag and drop here</p>
            </Card>
            <div className="flex items-center gap-4">
              <div className="h-px bg-border flex-1" />
              <span className="text-xs text-muted-foreground uppercase">OR</span>
              <div className="h-px bg-border flex-1" />
            </div>
            <Button variant="secondary" className="w-full h-16 rounded-xl border-2 border-border hover:border-[var(--hc-accent)] transition-colors">
              <Mic className="mr-2 h-5 w-5" />
              Record with Microphone
            </Button>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
