import React, { createContext, useContext, ReactNode } from 'react';
import { useBranchSelection } from '../hooks/useBranchSelection';
import type { Branch } from '../types/fx';
import type { AppTabType } from '../components/layout/NavigationDrawer';

export interface BranchContextType {
  activeTab: AppTabType;
  setActiveTab: (tab: AppTabType) => void;
  branches: Branch[];
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  isGlobalUser: boolean;
  setIsGlobalUser: (isGlobal: boolean | ((prev: boolean) => boolean)) => void;
  currentBranch: Branch | undefined;
  handleBranchChange: (branchId: string) => void;
  handleGlobalUserToggle: () => void;
  isSidebarCollapsed: boolean;
  handleToggleSidebar: () => void;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const branchState = useBranchSelection();

  return (
    <BranchContext.Provider value={branchState}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext(): BranchContextType {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranchContext must be used within a BranchProvider');
  }
  return context;
}
