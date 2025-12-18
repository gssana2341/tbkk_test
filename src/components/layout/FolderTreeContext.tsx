"use client";

import React, { createContext, useContext, useState } from "react";

interface FolderTreeContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const FolderTreeContext = createContext<FolderTreeContextType | undefined>(
  undefined
);

export const FolderTreeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <FolderTreeContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </FolderTreeContext.Provider>
  );
};

export const useFolderTree = () => {
  const context = useContext(FolderTreeContext);
  if (!context) {
    throw new Error("useFolderTree must be used within a FolderTreeProvider");
  }
  return context;
};
