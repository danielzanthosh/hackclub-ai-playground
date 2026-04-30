"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getOrInitUuid } from "@/lib/uuid";
import { applyAccentColor, HC_ACCENT_COLORS, DEFAULT_BASE_URL } from "@/lib/models";
import { decryptApiKey } from "@/lib/crypto";

interface UserContextValue {
  uuid: string;
  userId: Id<"users"> | null;
  name: string;
  avatarColor: string;
  accentColor: string;
  apiKey: string;         // decrypted, in-memory only
  baseUrl: string;
  customModels: string[];
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

  const getOrCreate = useMutation(api.users.getOrCreateUser);
  const user = useQuery(api.users.getUserByUuid, uuid ? { uuid } : "skip");

  // Init user on first load
  useEffect(() => {
    if (uuid && user === null) {
      getOrCreate({ uuid });
    }
  }, [uuid, user, getOrCreate]);

  // Apply accent color to CSS var
  useEffect(() => {
    if (user?.accentColor) {
      applyAccentColor(user.accentColor);
    }
  }, [user?.accentColor]);

  // Decrypt API key
  useEffect(() => {
    if (user?.apiKey) {
      decryptApiKey(user.apiKey).then(setApiKey);
    } else {
      setApiKey("");
    }
  }, [user?.apiKey]);

  return (
    <UserContext.Provider
      value={{
        uuid,
        userId: user?._id ?? null,
        name: user?.name ?? "Hack Clubber",
        avatarColor: user?.avatarColor ?? "#ec3750",
        accentColor: user?.accentColor ?? "#ec3750",
        apiKey,
        baseUrl: user?.baseUrl ?? DEFAULT_BASE_URL,
        customModels: user?.customModels ?? [],
        isReady: !!user,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
