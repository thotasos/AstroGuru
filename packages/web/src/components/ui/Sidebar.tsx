'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronRight,
  ChevronLeft,
  Star,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfiles } from '@/lib/hooks';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { profiles } = useProfiles();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      label: 'Profiles',
      href: '/profile',
      icon: <Users className="w-4 h-4" />,
      badge: profiles.length > 0 ? profiles.length : undefined,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-cosmic-border bg-cosmic-surface',
        'transition-all duration-300 shrink-0',
        collapsed ? 'w-14' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-5 border-b border-cosmic-border',
        collapsed && 'justify-center px-0',
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/20 shrink-0">
          <CosmicIcon />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <span className="block text-sm font-semibold text-stone-50 leading-tight whitespace-nowrap">
              Parashari
            </span>
            <span className="block text-xs text-gold-500 leading-tight whitespace-nowrap">
              Precision
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
              'transition-all duration-150 cursor-pointer',
              isActive(item.href)
                ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20'
                : 'text-stone-400 hover:bg-cosmic-elevated hover:text-stone-200',
              collapsed && 'justify-center px-0 w-10 mx-auto',
            )}
            title={collapsed ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-cosmic-elevated text-stone-400 text-xs px-1.5">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        ))}

        {/* New Chart quick action */}
        <div className={cn('pt-3 border-t border-cosmic-border mt-3', collapsed && 'flex justify-center')}>
          <Link
            href="/profile/new"
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
              'bg-gold-500/10 text-gold-400 border border-gold-500/20',
              'hover:bg-gold-500/20 transition-all duration-150 cursor-pointer',
              collapsed ? 'justify-center w-10 mx-auto px-0' : 'w-full',
            )}
            title={collapsed ? 'New Chart' : undefined}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>New Chart</span>}
          </Link>
        </div>
      </nav>

      {/* Recent profiles quick-switcher */}
      {!collapsed && profiles.length > 0 && (
        <div className="px-3 py-3 border-t border-cosmic-border">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 px-1">
            Recent
          </p>
          <div className="space-y-1">
            {profiles.slice(0, 3).map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.id}`}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs',
                  'text-stone-400 hover:bg-cosmic-elevated hover:text-stone-200',
                  'transition-all duration-150 cursor-pointer group',
                )}
              >
                <div className="w-5 h-5 rounded-full bg-gold-500/20 flex items-center justify-center shrink-0">
                  <span className="text-gold-400 text-[10px] font-semibold">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="flex-1 truncate">{profile.name}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="p-2 border-t border-cosmic-border">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg',
            'text-stone-500 hover:bg-cosmic-elevated hover:text-stone-300',
            'transition-all duration-150 cursor-pointer',
            collapsed ? 'mx-auto' : 'ml-auto',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}

function CosmicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Orbit ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke="#CA8A04"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="none"
        transform="rotate(-20 12 12)"
      />
      {/* Central star */}
      <circle cx="12" cy="12" r="2.5" fill="#CA8A04" />
      {/* Dot on orbit */}
      <circle cx="20" cy="9.5" r="1.5" fill="#CA8A04" fillOpacity="0.5" />
      {/* Star sparkle */}
      <line x1="12" y1="2" x2="12" y2="4" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="12" y1="20" x2="12" y2="22" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="2" y1="12" x2="4" y2="12" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      <line x1="20" y1="12" x2="22" y2="12" stroke="#CA8A04" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
    </svg>
  );
}
