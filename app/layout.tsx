import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "HC AI Playground — Hack Club",
  description: "A feature-complete AI testing playground for Hack Club members. BYOK, multimodal chat, image generation, speech, music, embeddings and more.",
  keywords: ["Hack Club", "AI", "playground", "BYOK", "LLM", "Gemini", "GPT", "chat"],
  authors: [{ name: "Grace Site" }, { name: "Daniel Santhosh" }],
  openGraph: {
    title: "HC AI Playground",
    description: "Test 30+ AI models with your Hack Club API key",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.1 0.006 265)",
              border: "1px solid oklch(0.18 0.008 265)",
              color: "oklch(0.92 0.01 265)",
            },
          }}
        />
        <SpeedInsights />
      </body>
    </html>
  );
}
