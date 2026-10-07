import React from 'react';
import { useControlCenter, ScreenId } from '../../context/ControlCenterContext.tsx';
import {
  LayoutDashboard,
  Bot,
  Activity as ActivityIcon,
  Cpu,
  Menu,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentScreen, setCurrentScreen } = useControlCenter();

  // Highlight 'more' if current screen is one of the secondary items
  const isMoreActive = [
    'more',
    'projects',
    'files',
    'terminal',
    'github',
    'mcp',
    'models',
    'monitor',
    'backups',
    'admin',
    'settings',
  ].includes(currentScreen);

  const navItems = [
    {
      id: 'home' as ScreenId,
      label: 'Home',
      icon: LayoutDashboard,
      isActive: currentScreen === 'home',
    },
    {
      id: 'claude' as ScreenId,
      label: 'Claude',
      icon: Bot,
      isActive: currentScreen === 'claude',
    },
    {
      id: 'activities' as ScreenId,
      label: 'Activities',
      icon: ActivityIcon,
      isActive: currentScreen === 'activities',
    },
    {
      id: 'jobs' as ScreenId,
      label: 'Jobs',
      icon: Cpu,
      isActive: currentScreen === 'jobs',
    },
    {
      id: 'more' as ScreenId,
      label: 'More',
      icon: Menu,
      isActive: isMoreActive,
    },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/98 backdrop-blur-md border-t border-slate-800/90 pb-[env(safe-area-inset-bottom,8px)] pt-1 px-2 select-none"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                item.isActive
                  ? 'text-amber-400 bg-amber-500/10 font-medium'
                  : 'text-slate-400 hover:text-slate-200 active:bg-slate-800/40'
              }`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${item.isActive ? 'scale-110' : ''}`} />
                {item.id === 'activities' && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 font-mono">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
