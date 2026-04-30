"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { useParams } from "@/components/params-panel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { generateImage } from "@/lib/hackclub-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImagesPage() {
  const { apiKey, baseUrl, userId } = useUser();
  const { params } = useParams();
  const [prompt, setPrompt] = useState("");
  const [imageModel, setImageModel] = useState("google/gemini-2.5-flash-image");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  const saveGeneration = useMutation(api.generations.saveGeneration);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !apiKey) return;

    setIsLoading(true);
    setError("");
    setOutputUrl(null);

    try {
      let url = "";
      
      // We route everything through Hack Club AI (OpenRouter) now!
      url = await generateImage(baseUrl, apiKey, prompt, imageModel);
      
      setOutputUrl(url);

      if (userId && url) {
        await saveGeneration({
          userId,
          mode: "image",
          prompt,
          params: JSON.stringify({ model: imageModel }),
          outputUrl: url,
          model: imageModel,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><ImageIcon className="h-6 w-6 text-[var(--hc-accent)]"/> Image Generation</h1>
          <p className="text-sm text-muted-foreground">Generate images from text prompts using models like Gemini Image Gen.</p>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row gap-3">
          <Input 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cyberpunk city skyline at night, neon lights, highly detailed, 4k..."
            className="flex-1"
          />
          <div className="flex gap-2 w-full md:w-auto items-center">
            <button 
              type="button"
              onClick={() => setIsCustomModel(!isCustomModel)}
              className="text-xs text-muted-foreground hover:text-foreground underline decoration-dashed underline-offset-4"
            >
              {isCustomModel ? "List" : "Custom"}
            </button>
            {isCustomModel ? (
              <Input 
                value={imageModel}
                onChange={(e) => setImageModel(e.target.value)}
                placeholder="e.g. google/gemini-2.5-flash-image"
                className="w-[180px] bg-background"
              />
            ) : (
              <Select value={imageModel} onValueChange={setImageModel}>
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">Google</div>
                  <SelectItem value="google/gemini-2.5-flash-image">Gemini 2.5 Flash Image</SelectItem>
                  <SelectItem value="google/gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image</SelectItem>
                  <SelectItem value="google/gemini-3-pro-image-preview">Gemini 3 Pro Image</SelectItem>
                  <div className="h-px bg-border my-1" />
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1.5 uppercase tracking-wider">OpenAI</div>
                  <SelectItem value="openai/gpt-5.4-image-2">GPT-5.4 Image 2</SelectItem>
                  <SelectItem value="openai/gpt-5-image">GPT-5 Image</SelectItem>
                  <SelectItem value="openai/gpt-5-image-mini">GPT-5 Image Mini</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button type="submit" disabled={!prompt.trim() || isLoading || !apiKey}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
            {error}
          </div>
        )}

        {/* Output Area */}
        <Card className="min-h-[400px] border-dashed bg-card/30 flex items-center justify-center relative overflow-hidden">
          {isLoading && (
            <div className="flex flex-col items-center gap-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--hc-accent)]" />
              <p className="text-sm animate-pulse">Generating your image...</p>
            </div>
          )}
          
          {!isLoading && outputUrl && (
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 relative bg-black/20 flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={outputUrl} alt={prompt} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
              </div>
              <div className="p-4 bg-card border-t border-border flex justify-between items-center">
                <p className="text-xs text-muted-foreground truncate max-w-lg" title={prompt}>{prompt}</p>
                <Button variant="secondary" size="sm" asChild>
                  <a href={outputUrl} download target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-2" /> Download
                  </a>
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !outputUrl && !error && (
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Enter a prompt above to generate an image.</p>
              <p className="text-xs opacity-60 mt-1">Select or type your preferred image generation model.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
