'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GitBranch,
  BarChart3,
  BookOpen,
  Star,
  Layers,
  Activity,
  Zap,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/lib/hooks';

const TABS = [
  { id: 'chart', label: 'Chart', icon: <GitBranch className="w-3.5 h-3.5" /> },
  { id: 'vargas', label: 'Vargas', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'dashas', label: 'Dashas', icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'predictions', label: 'Predictions', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'yogas', label: 'Yogas', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'strengths', label: 'Strengths', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  { id: 'ashtakavarga', label: 'Ashtakavarga', icon: <Star className="w-3.5 h-3.5" /> },
  { id: 'journal', label: 'Journal', icon: <BookOpen className="w-3.5 h-3.5" /> },
];

interface ProfileLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default function ProfileLayout({ children, params }: ProfileLayoutProps) {
  const { id } = use(params);
  const pathname = usePathname();
  const { profile, isLoading } = useProfile(id);

  const activeTab = TABS.find((t) => pathname.includes(`/${t.id}`))?.id ?? 'chart';

  return (
    <div className="flex flex-col min-h-screen">
      {/* Profile header */}
      <div className="sticky top-0 z-30 bg-[#0C0A09]/95 backdrop-blur-sm border-b border-cosmic-border">
        <div className="px-6 pt-4 pb-0 max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/profile"
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-300 transition-colors duration-150"
            >
              <ArrowLeft className="w-3 h-3" />
              Profiles
            </Link>
            <span className="text-stone-700">/</span>
            {isLoading ? (
              <div className="h-3 w-24 bg-cosmic-elevated rounded animate-pulse" />
            ) : (
              <span className="text-xs text-stone-300 font-medium">{profile?.name}</span>
            )}
          </div>

          {/* Profile name + meta */}
          {profile && (
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                <span className="text-gold-400 font-semibold text-sm">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-base font-semibold text-stone-50">{profile.name}</h1>
                <p className="text-xs text-stone-400">
                  {new Date(profile.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })} · {profile.locationName} · {profile.ayanamsaId}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0.5 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={`/profile/${id}/${tab.id}`}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap',
                  'transition-all duration-150 border-b-2',
                  activeTab === tab.id
                    ? 'text-gold-400 border-gold-500 bg-gold-500/5'
                    : 'text-stone-400 border-transparent hover:text-stone-200 hover:bg-cosmic-elevated',
                )}
              >
                {tab.icon}
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-6 py-6 max-w-7xl mx-auto w-full">
        {children}
      </div>
    </div>
  );
}
