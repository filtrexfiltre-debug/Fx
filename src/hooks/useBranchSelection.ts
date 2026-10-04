import { useEffect, useState } from 'react';
import { branchContext, fxApi } from '../services/api';
import type { Branch } from '../types/fx';
import type { AppTabType } from '../components/layout/NavigationDrawer';
import { safeLocalStorage, readStoredBoolean } from '../lib/storage';

export function useBranchSelection() {
  const [activeTab, setActiveTab] = useState<AppTabType>('musteri');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchContext.getSelectedBranchId());
  const [isGlobalUser, setIsGlobalUser] = useState<boolean>(branchContext.getIsGlobalUser());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() =>
    readStoredBoolean('fx_drawer_collapsed', false)
  );

  useEffect(() => {
    const allBranches = fxApi.getBranches();
    setBranches(allBranches);

    const unsubscribe = branchContext.subscribe(() => {
      setBranches(fxApi.getBranches());
      setSelectedBranchId(branchContext.getSelectedBranchId());
      setIsGlobalUser(branchContext.getIsGlobalUser());
    });

    return () => unsubscribe();
  }, []);

  const currentBranch = branches.find((branch) => branch.id === selectedBranchId);

  const handleBranchChange = (branchId: string) => {
    branchContext.setSelectedBranchId(branchId);
    setSelectedBranchId(branchId);
  };

  const handleGlobalUserToggle = () => {
    if (!isGlobalUser) return;
    const nextBranchId = selectedBranchId === 'all' ? branches[0]?.id ?? '' : 'all';
    branchContext.setSelectedBranchId(nextBranchId);
    setSelectedBranchId(nextBranchId);
  };

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      safeLocalStorage.setItem('fx_drawer_collapsed', String(next));
      return next;
    });
  };

  return {
    activeTab,
    setActiveTab,
    branches,
    selectedBranchId,
    setSelectedBranchId,
    isGlobalUser,
    setIsGlobalUser,
    currentBranch,
    handleBranchChange,
    handleGlobalUserToggle,
    isSidebarCollapsed,
    handleToggleSidebar,
  };
}
