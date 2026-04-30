"use client";

import { createContext, useContext, useState } from "react";

interface LayoutStateContextType {
  isSidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  isParamsOpen: boolean;
  setParamsOpen: (v: boolean) => void;
}

const LayoutStateContext = createContext<LayoutStateContextType>({
  isSidebarOpen: true,
  setSidebarOpen: () => {},
  isParamsOpen: true,
  setParamsOpen: () => {},
});

export function useLayoutState() {
  return useContext(LayoutStateContext);
}

export function LayoutStateProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isParamsOpen, setParamsOpen] = useState(true);

  return (
    <LayoutStateContext.Provider
      value={{
        isSidebarOpen,
        setSidebarOpen,
        isParamsOpen,
        setParamsOpen,
      }}
    >
      {children}
    </LayoutStateContext.Provider>
  );
}
