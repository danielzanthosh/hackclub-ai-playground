"use client";

import { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { getOrInitUuid } from "@/lib/uuid";
import { applyAccentColor, DEFAULT_BASE_URL } from "@/lib/models";
import { decryptApiKey } from "@/lib/crypto";

interface UserContextValue {
  uuid: string;
  userId: string | null;
  name: string;
  avatarColor: string;
  accentColor: string;
  apiKey: string;
  baseUrl: string;
  customModels: string[];
  defaultChatModel: string;
  defaultSystemPrompt: string;
  personalization: {
    name?: string;
    age?: string;
    tone?: string;
    bio?: string;
  };
  isReady: boolean;
}

const UserContext = createContext<UserContextValue>({
  uuid: "",
  userId: null,
  name: "Hack Clubber",
  avatarColor: "#ec3750",
  accentColor: "#ec3750",
  apiKey: "",
  baseUrl: DEFAULT_BASE_URL,
  customModels: [],
  defaultChatModel: "google/gemini-2.5-flash",
  defaultSystemPrompt: "You are a helpful AI assistant.",
  personalization: {},
  isReady: false,
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [uuid, setUuid] = useState("");
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    setUuid(getOrInitUuid());
  }, []);

  const { data: user, mutate } = useSWR(
    uuid ? `user-${uuid}` : null,
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("uuid", uuid)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user:", error);
        return null;
      }
      return data;
    }
  );

  // Init user on first load
  useEffect(() => {
    if (uuid && user === null) {
      const initUser = async () => {
        const { data, error } = await supabase
          .from("users")
          .insert([
            {
              uuid,
              name: "Hack Clubber",
              avatar_color: "#ec3750",
              accent_color: "#ec3750",
              api_key: "",
              base_url: DEFAULT_BASE_URL,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Error creating user:", error);
        } else {
          mutate(data);
        }
      };
      initUser();
    }
  }, [uuid, user, mutate]);

  // Apply accent color to CSS var
  useEffect(() => {
    if (user?.accent_color) {
      applyAccentColor(user.accent_color);
    }
  }, [user?.accent_color]);

  // Decrypt API key
  useEffect(() => {
    if (user?.api_key) {
      decryptApiKey(user.api_key).then(setApiKey);
    } else {
      setApiKey("");
    }
  }, [user?.api_key]);

  return (
    <UserContext.Provider
      value={{
        uuid,
        userId: user?.id ?? null,
        name: user?.name ?? "Hack Clubber",
        avatarColor: user?.avatar_color ?? "#ec3750",
        accentColor: user?.accent_color ?? "#ec3750",
        apiKey,
        baseUrl: user?.base_url ?? DEFAULT_BASE_URL,
        customModels: user?.custom_models ?? [],
        defaultChatModel: user?.default_chat_model ?? "google/gemini-2.5-flash",
        defaultSystemPrompt: user?.default_system_prompt ?? "You are a helpful AI assistant.",
        personalization: user?.personalization ?? {},
        isReady: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
