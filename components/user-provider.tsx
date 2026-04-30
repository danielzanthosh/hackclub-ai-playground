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
  sub: string | null;
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
  login: () => void;
  logout: () => void;
}

const UserContext = createContext<UserContextValue>({
  uuid: "",
  userId: null,
  sub: null,
  name: "Hack Clubber",
  avatarColor: "#ec3750",
  accentColor: "#ec3750",
  apiKey: "",
  baseUrl: "https://ai.hackclub.com/proxy/v1",
  customModels: [],
  defaultChatModel: "google/gemini-2.5-flash",
  defaultSystemPrompt: "You are a helpful AI assistant.",
  personalization: {},
  isReady: false,
  login: () => {},
  logout: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [uuid, setUuid] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    setUuid(getOrInitUuid());
    
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: user, mutate } = useSWR(
    uuid || sessionUser ? `user-${uuid}-${sessionUser?.id}` : null,
    async () => {
      // 1. Try to find user by 'sub' (authenticated)
      if (sessionUser) {
        const { data: authUser, error: authError } = await supabase
          .from("users")
          .select("*")
          .eq("sub", sessionUser.id)
          .single();
        
        if (authUser) return authUser;
        
        // 2. If no 'sub' match, try to link current 'uuid' user to this 'sub'
        if (uuid) {
          const { data: anonUser } = await supabase
            .from("users")
            .select("*")
            .eq("uuid", uuid)
            .single();

          if (anonUser && !anonUser.sub) {
            const { data: linkedUser, error: linkError } = await supabase
              .from("users")
              .update({ sub: sessionUser.id, name: sessionUser.user_metadata?.full_name || anonUser.name })
              .eq("uuid", uuid)
              .select()
              .single();
            
            if (!linkError) return linkedUser;
          }
        }
      }

      // 3. Fallback to anonymous lookup
      if (uuid) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("uuid", uuid)
          .single();

        if (!error) return data;
      }
      
      return null;
    }
  );

  // Init user on first load if nothing found
  useEffect(() => {
    if (uuid && user === null && !sessionUser) {
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
              base_url: "https://ai.hackclub.com/proxy/v1",
            },
          ])
          .select()
          .single();

        if (!error) mutate(data);
      };
      initUser();
    }
  }, [uuid, user, sessionUser, mutate]);

  const login = () => {
    supabase.auth.signInWithOAuth({
      provider: "keycloak" as any, // Reverting to keycloak slot for stability
      options: {
        redirectTo: window.location.origin,
        scopes: "openid profile email slack_id",
      }
    });
  };

  const logout = () => {
    supabase.auth.signOut();
  };

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
        sub: user?.sub ?? null,
        name: user?.name ?? "Hack Clubber",
        avatarColor: user?.avatar_color ?? "#ec3750",
        accentColor: user?.accent_color ?? "#ec3750",
        apiKey,
        baseUrl: user?.base_url ?? "https://ai.hackclub.com/proxy/v1",
        customModels: user?.custom_models ?? [],
        defaultChatModel: user?.default_chat_model ?? "google/gemini-2.5-flash",
        defaultSystemPrompt: user?.default_system_prompt ?? "You are a helpful AI assistant.",
        personalization: user?.personalization ?? {},
        isReady: !!user,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
