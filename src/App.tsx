import React from 'react';
import { AuthProvider, useAuthContext } from './context/AuthContext';
import { BranchProvider, useBranchContext } from './context/BranchContext';
import { RequireAuth } from './components/guards/RequireAuth';
import { AppShell } from './components/layout/AppShell';

function MainAppShell() {
  const auth = useAuthContext();
  const branchState = useBranchContext();

  return (
    <AppShell
      activeTab={branchState.activeTab}
      setActiveTab={branchState.setActiveTab}
      branches={branchState.branches}
      selectedBranchId={branchState.selectedBranchId}
      currentBranch={branchState.currentBranch}
      isGlobalUser={branchState.isGlobalUser}
      onBranchChange={branchState.handleBranchChange}
      onGlobalUserToggle={branchState.handleGlobalUserToggle}
      currentUser={auth.currentUser}
      isSidebarCollapsed={branchState.isSidebarCollapsed}
      onToggleSidebar={branchState.handleToggleSidebar}
      onLogout={auth.handleLogout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BranchProvider>
        <RequireAuth>
          <MainAppShell />
        </RequireAuth>
      </BranchProvider>
    </AuthProvider>
  );
}
