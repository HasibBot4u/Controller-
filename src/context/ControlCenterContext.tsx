import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { services as defaultServices, setServiceMode, ServiceContainer, ServiceMode } from '../services/api-service.ts';
import { PendingApproval } from '../domain/models/index.ts';
import { ApprovalStatus, HealthStatus } from '../domain/enums/index.ts';

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

export type ConnectionState =
  | 'CHECKING'
  | 'ONLINE'
  | 'NETWORK_OFFLINE'
  | 'CONTROL_UNAVAILABLE'
  | 'DEGRADED';

interface ControlCenterContextType {
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  selectedActivityId: string | null;
  setSelectedActivityId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  simulateOffline: boolean;
  setSimulateOffline: (val: boolean) => void;
  activeApproval: PendingApproval | null;
  approvalErrorMessage: string | null;
  requestApproval: (approval: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>) => Promise<boolean>;
  resolveApproval: (id: string, status: ApprovalStatus) => Promise<void>;
  closeApprovalModal: () => void;
  services: ServiceContainer;
  serviceMode: ServiceMode;
  switchServiceMode: (mode: ServiceMode) => void;
  refreshKey: number;
  triggerRefresh: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ControlCenterContext = createContext<ControlCenterContextType | null>(null);

function parseHashLocation(): { screen: ScreenId; activityId: string | null } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { screen: 'home', activityId: null };

  const parts = hash.split('/');
  const validScreens: ScreenId[] = [
    'home', 'claude', 'activities', 'jobs', 'more',
    'projects', 'files', 'terminal', 'github', 'mcp',
    'models', 'monitor', 'backups', 'admin', 'settings'
  ];

  const screen = validScreens.includes(parts[0] as ScreenId) ? (parts[0] as ScreenId) : 'home';
  const activityId = parts[0] === 'activities' && parts[1] ? parts[1] : null;

  return { screen, activityId };
}

export const ControlCenterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const initialNav = parseHashLocation();
  const [currentScreen, setCurrentScreenState] = useState<ScreenId>(initialNav.screen);
  const [selectedActivityId, setSelectedActivityIdState] = useState<string | null>(initialNav.activityId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('CHECKING');

  const [serviceMode, setServiceModeState] = useState<ServiceMode>('http');
  const [activeServices, setActiveServices] = useState<ServiceContainer>(defaultServices);

  const [activeApproval, setActiveApproval] = useState<PendingApproval | null>(null);
  const [approvalErrorMessage, setApprovalErrorMessage] = useState<string | null>(null);
  const [approvalResolver, setApprovalResolver] = useState<((approved: boolean) => void) | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(1);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Sync hash routing for mobile navigation
  const setCurrentScreen = (screen: ScreenId) => {
    setCurrentScreenState(screen);
    if (screen !== 'activities') {
      setSelectedActivityIdState(null);
      window.location.hash = `#${screen}`;
    } else {
      window.location.hash = selectedActivityId ? `#activities/${selectedActivityId}` : '#activities';
    }
  };

  const setSelectedActivityId = (id: string | null) => {
    setSelectedActivityIdState(id);
    if (id) {
      setCurrentScreenState('activities');
      window.location.hash = `#activities/${id}`;
    } else if (currentScreen === 'activities') {
      window.location.hash = '#activities';
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const nav = parseHashLocation();
      setCurrentScreenState(nav.screen);
      setSelectedActivityIdState(nav.activityId);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Real Health Check Flow (Item 8)
  const checkHealth = async () => {
    if (!navigator.onLine || simulateOffline) {
      setConnectionState('NETWORK_OFFLINE');
      return;
    }

    try {
      const res = await activeServices.healthApi.getHealth();
      if (res.data?.controlPlane?.status === HealthStatus.HEALTHY) {
        setConnectionState('ONLINE');
      } else if (res.data?.controlPlane?.status === HealthStatus.DEGRADED) {
        setConnectionState('DEGRADED');
      } else {
        setConnectionState('CONTROL_UNAVAILABLE');
      }
    } catch (_err) {
      setConnectionState('CONTROL_UNAVAILABLE');
    }
  };

  useEffect(() => {
    checkHealth();
    const handleOnline = () => checkHealth();
    const handleOffline = () => setConnectionState('NETWORK_OFFLINE');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeServices, simulateOffline, refreshKey]);

  const switchServiceMode = (mode: ServiceMode) => {
    const container = setServiceMode(mode);
    setServiceModeState(mode);
    setActiveServices(container);
    triggerRefresh();
  };

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

  // Authoritative server-side approval flow (Item 27)
  const requestApproval = async (
    approvalData: Omit<PendingApproval, 'schemaVersion' | 'id' | 'requestedAt' | 'status'>
  ): Promise<boolean> => {
    setApprovalErrorMessage(null);
    try {
      const res = await activeServices.approvalsApi.createApproval(approvalData);
      return new Promise((resolve) => {
        setActiveApproval(res.data);
        setApprovalResolver(() => resolve);
      });
    } catch (e) {
      console.error('Failed to create server approval:', e);
      setApprovalErrorMessage('Approval service unavailable. Action blocked.');
      // NO local fallback approval created. Action blocked!
      return false;
    }
  };

  const resolveApproval = async (id: string, status: ApprovalStatus) => {
    try {
      await activeServices.approvalsApi.resolveApproval(id, status);
      // Only resolve promise if server confirmed resolution
      if (approvalResolver) {
        approvalResolver(status === ApprovalStatus.APPROVED);
        setApprovalResolver(null);
      }
      setActiveApproval(null);
      setApprovalErrorMessage(null);
      triggerRefresh();
    } catch (e) {
      console.error('Error resolving approval on server:', e);
      // Keep approval visible if server resolution fails
      setApprovalErrorMessage('Server failed to record approval resolution. Action not executed.');
    }
  };

  const closeApprovalModal = () => {
    if (approvalResolver) {
      approvalResolver(false);
      setApprovalResolver(null);
    }
    setActiveApproval(null);
    setApprovalErrorMessage(null);
  };

  return (
    <ControlCenterContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        selectedActivityId,
        setSelectedActivityId,
        selectedProjectId,
        setSelectedProjectId,
        connectionState,
        setConnectionState,
        simulateOffline,
        setSimulateOffline,
        activeApproval,
        approvalErrorMessage,
        requestApproval,
        resolveApproval,
        closeApprovalModal,
        services: activeServices,
        serviceMode,
        switchServiceMode,
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
