export const HC_ACCENT_COLORS = [
  { name: "Red",    hex: "#ec3750", var: "--hc-red"    },
  { name: "Orange", hex: "#ff8c37", var: "--hc-orange" },
  { name: "Yellow", hex: "#f1c40f", var: "--hc-yellow" },
  { name: "Green",  hex: "#33d6a6", var: "--hc-green"  },
  { name: "Cyan",   hex: "#5bc0de", var: "--hc-cyan"   },
  { name: "Blue",   hex: "#338eda", var: "--hc-blue"   },
  { name: "Purple", hex: "#a633d6", var: "--hc-purple" },
  { name: "Muted",  hex: "#8492a6", var: "--hc-muted"  },
] as const;

export type HCAccentColor = (typeof HC_ACCENT_COLORS)[number]["hex"];

export const DEFAULT_BASE_URL = "/proxy";

export interface ModelInfo {
  id: string;
  name: string;
  type: "text" | "image" | "embedding" | "audio";
  supportsVision?: boolean;
  supportsAudio?: boolean;
  contextLength?: number;
  description?: string;
}

export const BUILTIN_MODELS: ModelInfo[] = []; // Empty, we fetch dynamically now

// Replicate models used via /api/replicate
export const REPLICATE_MODELS = {
  tts: "minimax/speech-02-turbo",
  stt: "vaibhavs10/incredibly-fast-whisper",
  music: "google/lyria-2",
  imageUpscale: "google/upscaler",
  bgRemove: "lucataco/remove-bg",
  ocr: "cuuupid/glm-4v-9b",
  videoMatte: "arielreplicate/robust_video_matting",
} as const;

export function applyAccentColor(hex: string) {
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--hc-accent", hex);
    document.documentElement.style.setProperty("--primary", hex);
    document.documentElement.style.setProperty("--ring", hex);
    document.documentElement.style.setProperty("--sidebar-primary", hex);
    document.documentElement.style.setProperty("--sidebar-ring", hex);
  }
}

export function groupModelsByType(models: ModelInfo[]) {
  return {
    text: models.filter((m) => m.type === "text"),
    image: models.filter((m) => m.type === "image"),
    embedding: models.filter((m) => m.type === "embedding"),
    audio: models.filter((m) => m.type === "audio"),
  };
}
