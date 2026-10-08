/**
 * @license Apache-2.0
 * Claude Cloud Control Center
 * Mobile-First Remote Control Plane for Cloud-Hosted Development Workstations
 */
import React from 'react';
import { ControlCenterProvider, useControlCenter } from './context/ControlCenterContext.tsx';
import { FirebaseAuthProvider } from './context/FirebaseAuthContext.tsx';
import { Header } from './components/common/Header.tsx';
import { BottomNav } from './components/common/BottomNav.tsx';
import { OfflineBanner } from './components/common/OfflineBanner.tsx';
import { ApprovalModal } from './components/common/ApprovalModal.tsx';

// Primary & Secondary Screens
import { HomeScreen } from './components/features/home/HomeScreen.tsx';
import { ClaudeScreen } from './components/features/claude/ClaudeScreen.tsx';
import { ActivitiesScreen } from './components/features/activities/ActivitiesScreen.tsx';
import { JobsScreen } from './components/features/jobs/JobsScreen.tsx';
import { MoreScreen } from './components/features/more/MoreScreen.tsx';
import { ProjectsScreen } from './components/features/projects/ProjectsScreen.tsx';
import { FilesScreen } from './components/features/files/FilesScreen.tsx';
import { TerminalScreen } from './components/features/terminal/TerminalScreen.tsx';
import { GitHubScreen } from './components/features/github/GitHubScreen.tsx';
import { McpScreen } from './components/features/mcp/McpScreen.tsx';
import { ModelsScreen } from './components/features/models/ModelsScreen.tsx';
import { MonitoringScreen } from './components/features/monitoring/MonitoringScreen.tsx';
import { BackupsScreen } from './components/features/backups/BackupsScreen.tsx';
import { AdminScreen } from './components/features/admin/AdminScreen.tsx';
import { SettingsScreen } from './components/features/settings/SettingsScreen.tsx';

const MainContent: React.FC = () => {
  const { currentScreen } = useControlCenter();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'claude':
        return <ClaudeScreen />;
      case 'activities':
        return <ActivitiesScreen />;
      case 'jobs':
        return <JobsScreen />;
      case 'more':
        return <MoreScreen />;
      case 'projects':
        return <ProjectsScreen />;
      case 'files':
        return <FilesScreen />;
      case 'terminal':
        return <TerminalScreen />;
      case 'github':
        return <GitHubScreen />;
      case 'mcp':
        return <McpScreen />;
      case 'models':
        return <ModelsScreen />;
      case 'monitor':
        return <MonitoringScreen />;
      case 'backups':
        return <BackupsScreen />;
      case 'admin':
        return <AdminScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      <OfflineBanner />
      <Header />
      <main className="flex-1 overflow-x-hidden">
        {renderScreen()}
      </main>
      <BottomNav />
      <ApprovalModal />
    </div>
  );
};

export default function App() {
  return (
    <FirebaseAuthProvider>
      <ControlCenterProvider>
        <MainContent />
      </ControlCenterProvider>
    </FirebaseAuthProvider>
  );
}
