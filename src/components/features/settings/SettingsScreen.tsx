import React, { useState, useEffect } from 'react';
import { useControlCenter } from '../../../context/ControlCenterContext.tsx';
import { useFirebaseAuth } from '../../../context/FirebaseAuthContext.tsx';
import firebaseConfig from '../../../../firebase-applet-config.json';
import { testFirestoreConnectionDetailed, FirestorePingDetail } from '../../../services/firebase.ts';
import { requestJson } from '../../../adapters/http/http-client.ts';
import { HealthStatusResponse } from '../../../domain/models/index.ts';
import {
  Settings,
  Sun,
  Moon,
  WifiOff,
  Wifi,
  Smartphone,
  Shield,
  Layers,
  RotateCcw,
  Info,
  CheckCircle2,
  Database,
  User as UserIcon,
  LogIn,
  LogOut,
  Flame,
  Activity,
  AlertCircle,
  Clock,
  Server,
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    toggleTheme,
    simulateOffline,
    setSimulateOffline,
    selectedProjectId,
    setSelectedProjectId,
    triggerRefresh,
    refreshKey,
  } = useControlCenter();

  const {
    currentUser,
    authLoading,
    firestoreConnected,
    signIn,
    signOut,
    checkConnection,
  } = useFirebaseAuth();

  const [testingPing, setTestingPing] = useState(false);
  const [pingDetail, setPingDetail] = useState<FirestorePingDetail | null>(null);
  const [serverHealth, setServerHealth] = useState<HealthStatusResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchServerHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await requestJson<HealthStatusResponse>('/health');
      if (res.success && res.data) {
        setServerHealth(res.data);
      }
    } catch (_err) {
      // Server health unavailable
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchServerHealth();
  }, [refreshKey]);

  const handleTestPing = async () => {
    setTestingPing(true);
    try {
      const detail = await testFirestoreConnectionDetailed();
      setPingDetail(detail);
      await checkConnection();
      await fetchServerHealth();
    } catch (err: any) {
      setPingDetail({
        ok: false,
        latencyMs: 0,
        timestamp: new Date().toISOString(),
        error: err?.message || 'Connection test failed',
      });
    } finally {
      setTestingPing(false);
    }
  };

  const firestoreService = serverHealth?.services?.find((s) => s.name === 'Firestore Persistence Store');

  return (
    <div className="p-3.5 sm:p-6 space-y-4 max-w-4xl mx-auto pb-28 font-mono text-xs animate-in fade-in duration-150">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>Client & Control Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Thin-client configuration, cloud identity, and test harness controls
        </p>
      </div>

      {/* Firebase Cloud Identity & Persistence Readiness */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs sm:text-sm">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Firebase & Cloud Identity</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
            currentUser
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          }`}>
            {currentUser ? 'AUTHENTICATED' : authLoading ? 'CHECKING AUTH...' : 'UNAUTHENTICATED'}
          </span>
        </div>

        {/* Fact 1: Client & Project Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
            <div className="text-slate-500 text-[10px]">Project ID</div>
            <div className="font-semibold text-amber-300 truncate">{firebaseConfig.projectId}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80">
            <div className="text-slate-500 text-[10px]">Firestore Database</div>
            <div className="font-semibold text-amber-300 truncate">{firebaseConfig.firestoreDatabaseId}</div>
          </div>
        </div>

        {/* Fact 2: Authentication Readiness */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt=""
                  className="w-8 h-8 rounded-full border border-amber-500/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-slate-200 truncate">
                  {currentUser.displayName || 'Authenticated User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{currentUser.email}</div>
                <div className="text-[9px] text-slate-500 font-mono">UID: {currentUser.uid}</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold text-slate-200">Not Signed In</div>
              <p className="text-[11px] text-slate-400">
                Sign in with Google to authenticate your remote control plane identity.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {currentUser ? (
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={signIn}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In with Google</span>
              </button>
            )}

            <button
              onClick={handleTestPing}
              disabled={testingPing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Test Firestore Connection"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{testingPing ? 'Pinging...' : 'Ping Firestore'}</span>
            </button>
          </div>
        </div>

        {/* Fact 3: Firestore Client Reachability Result */}
        {pingDetail && (
          <div className={`p-3 rounded-lg border text-[11px] font-mono space-y-1 ${
            pingDetail.ok
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <span>{pingDetail.ok ? 'SUCCESS: Firestore Reachable' : 'FAILED: Firestore Unreachable'}</span>
              <span>{pingDetail.latencyMs}ms</span>
            </div>
            {pingDetail.error && (
              <div className="text-[10px] text-rose-400 break-words">{pingDetail.error}</div>
            )}
            <div className="text-[9px] text-slate-500">Tested: {pingDetail.timestamp}</div>
          </div>
        )}

        {/* Fact 4: Durable Repository Readiness (Backend Authority) */}
        <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
              <Server className="w-3.5 h-3.5 text-sky-400" />
              <span>Server-Authoritative Persistence Model</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
              serverHealth?.persistence === 'FIRESTORE'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              {serverHealth ? serverHealth.persistence : loadingHealth ? 'CHECKING...' : 'UNKNOWN'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {serverHealth?.persistence === 'FIRESTORE'
              ? 'Authoritative server repository is connected to Firestore. Operations persist durably across restarts.'
              : 'Authoritative server repository is in isolated Memory adapter. Remote execution and storage remain decoupled.'}
          </p>
          {firestoreService && (
            <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-800/60">
              <span>Backend status: {firestoreService.status}</span>
              <span>•</span>
              <span>Message: {firestoreService.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Thin-Client Architectural Principle Card */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs sm:text-sm">
          <Smartphone className="w-4 h-4 text-amber-400" />
          <span>Architectural Rule: Thin-Client Only</span>
        </div>
        <p className="text-slate-300 text-xs leading-relaxed">
          Your browser is purely a remote display and command dispatch surface.
          No LLM runtimes, MCP servers, builds, tests, or bash environments run on this device.
          All execution occurs securely on the cloud-hosted Oracle Linux VM instance.
        </p>
      </div>

      {/* Settings Options */}
      <div className="space-y-3">
        {/* Appearance Mode */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Appearance Theme</span>
            <span className="text-slate-400 text-xs">Switch between dark technical console and light UI</span>
          </div>
          <button
            onClick={toggleTheme}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
          >
            {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span className="capitalize">{theme} Mode</span>
          </button>
        </div>

        {/* Offline Simulation Toggle */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">
              Simulate Network Dropout (LTE / Flight)
            </span>
            <span className="text-slate-400 text-xs">
              Test continuity banner and thin-client reconnection behavior
            </span>
          </div>
          <button
            onClick={() => setSimulateOffline(!simulateOffline)}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-2 cursor-pointer transition-colors font-medium ${
              simulateOffline
                ? 'bg-rose-950/80 border border-rose-700 text-rose-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            {simulateOffline ? <WifiOff className="w-4 h-4 text-rose-400" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span>{simulateOffline ? 'Disconnected (Simulated)' : 'Connected'}</span>
          </button>
        </div>

        {/* Default Workspace Project */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Default Project Context</span>
            <span className="text-slate-400 text-xs">Scope client navigation to specific workstation repo</span>
          </div>
          <select
            value={selectedProjectId || 'proj-01'}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-black/50 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
          >
            <option value="proj-01">claude-workstation-core (proj-01)</option>
            <option value="proj-02">mcp-agent-gateway (proj-02)</option>
            <option value="proj-03">mobile-control-ui (proj-03)</option>
          </select>
        </div>

        {/* Cache & State Reset */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-200 block text-xs sm:text-sm">Transient Client State</span>
            <span className="text-slate-400 text-xs">Re-sync view caches with remote mock adapter repositories</span>
          </div>
          <button
            onClick={triggerRefresh}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Re-sync Views</span>
          </button>
        </div>
      </div>
    </div>
  );
};
