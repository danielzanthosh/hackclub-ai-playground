"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { useParams } from "@/components/params-panel";
import { generateEmbedding, cosineSimilarity } from "@/lib/hackclub-ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Hash, ArrowRightLeft } from "lucide-react";

export default function EmbeddingsPage() {
  const { apiKey, baseUrl } = useUser();
  const { params } = useParams();
  
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resultA, setResultA] = useState<number[] | null>(null);
  const [resultB, setResultB] = useState<number[] | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);

  const handleCompare = async () => {
    if (!inputA.trim() || !apiKey) return;
    setIsLoading(true);
    
    try {
      const model = params.model || "google/gemini-embedding-2-preview";
      
      const embA = await generateEmbedding(baseUrl, apiKey, inputA, model);
      setResultA(embA);
      
      if (inputB.trim()) {
        const embB = await generateEmbedding(baseUrl, apiKey, inputB, model);
        setResultB(embB);
        setSimilarity(cosineSimilarity(embA, embB));
      } else {
        setResultB(null);
        setSimilarity(null);
      }
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
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2"><Hash className="h-6 w-6 text-[var(--hc-accent)]"/> Embeddings</h1>
          <p className="text-sm text-muted-foreground">Convert text into high-dimensional vectors and compare their semantic similarity.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Input A</label>
            <Textarea
              value={inputA}
              onChange={(e) => setInputA(e.target.value)}
              placeholder="First text to embed..."
              className="min-h-[100px] resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Input B (Optional comparison)</label>
            <Textarea
              value={inputB}
              onChange={(e) => setInputB(e.target.value)}
              placeholder="Second text to compare..."
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <Button onClick={handleCompare} disabled={!inputA.trim() || isLoading || !apiKey} className="w-full">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRightLeft className="mr-2 h-4 w-4" />}
          {inputB.trim() ? "Compare Similarity" : "Generate Embedding"}
        </Button>

        {similarity !== null && (
          <Card className="bg-card/50 border-[var(--hc-accent)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                Cosine Similarity Score
                <span className="text-2xl font-bold text-[var(--hc-accent)]">{(similarity * 100).toFixed(1)}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[var(--hc-accent)] transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.max(0, similarity * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {resultA && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Card className="bg-secondary/50">
                <CardHeader className="py-3 px-4 border-b border-border">
                  <CardTitle className="text-xs font-mono text-muted-foreground">Vector A ({resultA.length} dims)</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="font-mono text-[10px] text-muted-foreground h-32 overflow-y-auto break-all">
                    [{resultA.map(v => v.toFixed(4)).join(', ')}]
                  </div>
                </CardContent>
             </Card>
             {resultB && (
               <Card className="bg-secondary/50">
                  <CardHeader className="py-3 px-4 border-b border-border">
                    <CardTitle className="text-xs font-mono text-muted-foreground">Vector B ({resultB.length} dims)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="font-mono text-[10px] text-muted-foreground h-32 overflow-y-auto break-all">
                      [{resultB.map(v => v.toFixed(4)).join(', ')}]
                    </div>
                  </CardContent>
               </Card>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
