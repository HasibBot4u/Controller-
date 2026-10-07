import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { services, ServiceContainer } from '../services/api-service.ts';
import { PendingApproval, Activity } from '../domain/models/index.ts';
import { RiskLevel, ApprovalStatus } from '../domain/enums/index.ts';

export type ScreenId =
  | 'home'
  | 'claude'
  | 'activities'
  | 'jobs'
  | 'more'
  | 'projects'
  | 'files'
  | 'terminal'
  | 'github'
  | 'mcp'
  | 'models'
  | 'monitor'
  | 'backups'
  | 'admin'
  | 'settings';

interface ControlCenterContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  selectedActivityId: string | null;
  setSelectedActivityId: (id: string | null) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  simulateOffline: boolean;
  setSimulateOffline: (val: boolean) => void;
  activeApproval: PendingApproval | null;
  requestApproval: (approval: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>) => Promise<boolean>;
  resolveApproval: (id: string, status: ApprovalStatus) => Promise<void>;
  closeApprovalModal: () => void;
  services: ServiceContainer;
  refreshKey: number;
  triggerRefresh: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ControlCenterContext = createContext<ControlCenterContextType | null>(null);

export const ControlCenterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-01');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [activeApproval, setActiveApproval] = useState<PendingApproval | null>(null);
  const [approvalResolver, setApprovalResolver] = useState<((approved: boolean) => void) | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(1);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const requestApproval = (approvalData: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>): Promise<boolean> => {
    return new Promise((resolve) => {
      const fullApproval: PendingApproval = {
        schemaVersion: 1,
        id: `appr-dyn-${Date.now()}`,
        requestedAt: new Date().toISOString(),
        status: ApprovalStatus.PENDING,
        ...approvalData,
      };
      setActiveApproval(fullApproval);
      setApprovalResolver(() => resolve);
    });
  };

  const resolveApproval = async (id: string, status: ApprovalStatus) => {
    if (services.activitiesApi) {
      try {
        await services.activitiesApi.resolveApproval(id, status);
      } catch (e) {
        console.error('Error resolving approval in adapter:', e);
      }
    }

    if (approvalResolver) {
      approvalResolver(status === ApprovalStatus.APPROVED);
      setApprovalResolver(null);
    }
    setActiveApproval(null);
    triggerRefresh();
  };

  const closeApprovalModal = () => {
    if (approvalResolver) {
      approvalResolver(false);
      setApprovalResolver(null);
    }
    setActiveApproval(null);
  };

  const effectiveOnline = isOnline && !simulateOffline;

  return (
    <ControlCenterContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        selectedActivityId,
        setSelectedActivityId,
        selectedProjectId,
        setSelectedProjectId,
        isOnline: effectiveOnline,
        setIsOnline,
        simulateOffline,
        setSimulateOffline,
        activeApproval,
        requestApproval,
        resolveApproval,
        closeApprovalModal,
        services,
        refreshKey,
        triggerRefresh,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </ControlCenterContext.Provider>
  );
};

export const useControlCenter = (): ControlCenterContextType => {
  const context = useContext(ControlCenterContext);
  if (!context) {
    throw new Error('useControlCenter must be used within ControlCenterProvider');
  }
  return context;
};
