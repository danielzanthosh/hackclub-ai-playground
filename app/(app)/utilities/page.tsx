"use client";

import { Wrench, Sparkles, Image as ImageIcon, Video, ScanText, ArrowLeft, Upload, Loader2, Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { useUser } from "@/components/user-provider";
import { REPLICATE_MODELS } from "@/lib/models";
import { Input } from "@/components/ui/input";

const UTILITIES = [
  {
    id: "upscale",
    title: "Image Upscaler",
    description: "Enhance and upscale images using Real-ESRGAN.",
    icon: Sparkles,
    color: "var(--hc-cyan)",
    accept: "image/*",
    model: REPLICATE_MODELS.imageUpscale,
  },
  {
    id: "bg-remove",
    title: "Remove Background",
    description: "Remove backgrounds from images instantly.",
    icon: ImageIcon,
    color: "var(--hc-green)",
    accept: "image/*",
    model: REPLICATE_MODELS.bgRemove,
  },
  {
    id: "ocr",
    title: "Extract Text (OCR)",
    description: "Extract text and data from any image using GLM-4V.",
    icon: ScanText,
    color: "var(--hc-purple)",
    accept: "image/*",
    model: REPLICATE_MODELS.ocr,
  },
  {
    id: "video-matte",
    title: "Video Background Removal",
    description: "Robust video matting for transparent backgrounds.",
    icon: Video,
    color: "var(--hc-orange)",
    accept: "video/*",
    model: REPLICATE_MODELS.videoMatte,
  },
];

export default function UtilitiesPage() {
  const { apiKey } = useUser();
  const [activeTool, setActiveTool] = useState<typeof UTILITIES[0] | null>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>("");
  const [prompt, setPrompt] = useState("Extract all text from this image perfectly.");
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileData(event.target?.result as string);
    };
    reader.readAsDataURL(selected);
  };

  const handleRun = async () => {
    if (!activeTool || !fileData || !apiKey) return;
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      if (activeTool.id === "ocr") {
        // Use OpenRouter vision capabilities for OCR
        const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ 
            model: "google/gemini-2.5-pro", 
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: fileData } }
                ]
              }
            ]
          }),
        });
        if (!res.ok) throw new Error("Processing failed.");
        const data = await res.json();
        setResult(data.choices?.[0]?.message?.content);
        return;
      }

      // Other tools use Replicate
      const input: any = activeTool.id.includes("video") 
        ? { video: fileData } 
        : { image: fileData };

      const res = await fetch("/api/replicate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: activeTool.model, input }),
      });

      if (!res.ok) throw new Error("Processing failed. Note: Replicate tools require a valid Replicate API key, not an OpenRouter key.");
      const data = await res.json();
      
      // Replicate outputs differ. Might be a string URL, or an array.
      if (Array.isArray(data.output)) {
        setResult(data.output.join("\n"));
      } else {
        setResult(data.output);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><Wrench className="h-6 w-6 text-[var(--hc-accent)]"/> AI Utilities</h1>
          <p className="text-sm text-muted-foreground">Single-purpose AI tools for specific tasks, powered by Replicate.</p>
        </div>

        {!activeTool ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {UTILITIES.map((tool) => (
              <Card key={tool.id} onClick={() => { setActiveTool(tool); setFile(null); setFileData(""); setResult(null); setError(""); }} className="group hover:border-[var(--hc-accent)] transition-colors cursor-pointer bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${tool.color} 15%, transparent)` }}>
                      <tool.icon className="h-5 w-5" style={{ color: tool.color }} />
                    </div>
                    <CardTitle className="text-lg">{tool.title}</CardTitle>
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="secondary" className="w-full group-hover:bg-[var(--hc-accent)] group-hover:text-primary-foreground transition-colors">
                    Open Tool
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button variant="ghost" onClick={() => setActiveTool(null)} className="mb-2 -ml-4 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Utilities
            </Button>

            <Card className="border-[var(--hc-accent)]/20 shadow-lg">
              <CardHeader className="border-b border-border/50 bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${activeTool.color} 15%, transparent)` }}>
                    <activeTool.icon className="h-6 w-6" style={{ color: activeTool.color }} />
                  </div>
                  <div>
                    <CardTitle>{activeTool.title}</CardTitle>
                    <CardDescription>{activeTool.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {activeTool.id === "ocr" && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Prompt</label>
                    <Input value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="What do you want to extract?" />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Input File</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept={activeTool.accept} onChange={handleFileChange} />
                    {fileData ? (
                      activeTool.accept.includes("video") ? (
                        <video src={fileData} className="max-h-48 rounded" controls />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={fileData} alt="Preview" className="max-h-48 rounded shadow" />
                      )
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-3 opacity-50" />
                        <p className="text-sm font-medium">Click to upload a {activeTool.accept.includes("video") ? "video" : "image"}</p>
                        <p className="text-xs text-muted-foreground mt-1">Maximum 5MB recommended for data URLs</p>
                      </>
                    )}
                  </div>
                </div>

                {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded border border-destructive/20">{error}</div>}

                <Button onClick={handleRun} disabled={!fileData || isLoading || !apiKey} className="w-full">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Run Tool"}
                </Button>

                {result && (
                  <div className="mt-8 space-y-2 pt-6 border-t border-border">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Result</label>
                    {typeof result === "string" && result.startsWith("http") ? (
                      <div className="relative rounded-lg overflow-hidden border border-border bg-black/5 flex justify-center p-4">
                        {result.includes(".mp4") ? (
                          <video src={result} controls className="max-w-full rounded shadow-lg" />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={result} alt="Result" className="max-w-full rounded shadow-lg" />
                        )}
                        <Button variant="secondary" size="sm" asChild className="absolute bottom-4 right-4 shadow-xl">
                          <a href={result} download target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4 mr-2" /> Download
                          </a>
                        </Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg border border-border whitespace-pre-wrap text-sm font-mono">
                        {String(result)}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
