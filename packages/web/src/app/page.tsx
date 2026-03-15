'use client';

import Link from 'next/link';
import { Users, Plus, Calendar, TrendingUp, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useProfiles } from '@/lib/hooks';
import { formatDate, cn } from '@/lib/utils';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-cosmic-border bg-cosmic-surface p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-cosmic-elevated rounded w-2/3" />
      <div className="h-3 bg-cosmic-elevated rounded w-1/2" />
      <div className="h-3 bg-cosmic-elevated rounded w-3/4" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center animate-fade-in">
      {/* Cosmic decoration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gold-500/5 border border-gold-500/10 flex items-center justify-center">
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="24" cy="24" r="20" stroke="#CA8A04" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />
            <circle cx="24" cy="24" r="5" fill="#CA8A04" fillOpacity="0.8" />
            <circle cx="24" cy="6" r="2" fill="#CA8A04" fillOpacity="0.4" />
            <circle cx="42" cy="24" r="2" fill="#CA8A04" fillOpacity="0.3" />
            <circle cx="24" cy="42" r="1.5" fill="#CA8A04" fillOpacity="0.2" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
          <span className="text-gold-400 text-[8px]">✦</span>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-stone-50 mb-2">
        Begin Your Jyotish Journey
      </h2>
      <p className="text-stone-400 max-w-sm mb-8 leading-relaxed">
        Create your first Vedic natal chart to unlock dashas, yogas, shadbala
        strengths, and life event analysis rooted in the Parashari tradition.
      </p>

      <Link href="/profile/new">
        <Button size="lg" variant="primary" leftIcon={<Plus className="w-5 h-5" />}>
          Create First Chart
        </Button>
      </Link>

      <p className="mt-6 text-xs text-stone-600">
        Requires birth date, time (with seconds), and location
      </p>
    </div>
  );
}

function ProfileCard({ profile }: { profile: ReturnType<typeof useProfiles>['profiles'][number] }) {
  return (
    <Link href={`/profile/${profile.id}`}>
      <Card
        hoverable
        className="group cursor-pointer transition-all duration-200 hover:border-gold-500/30 hover:gold-glow-sm"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0 group-hover:bg-gold-500/15 transition-colors duration-200">
              <span className="text-gold-400 font-semibold text-sm">
                {profile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-stone-50 text-sm leading-tight">
                {profile.name}
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                {formatDate(profile.dateOfBirth)}
              </p>
            </div>
          </div>
          <Badge variant="active" size="sm">Active</Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="text-stone-600">Location</span>
            <span className="text-stone-400 truncate">{profile.locationName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <span className="text-stone-600">Ayanamsa</span>
            <span className="text-stone-400">{profile.ayanamsaId}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-cosmic-border flex items-center justify-between">
          <span className="text-xs text-stone-600">
            Added {formatDate(profile.createdAt)}
          </span>
          <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            View chart →
          </span>
        </div>
      </Card>
    </Link>
  );
}

function StatsBar({ totalProfiles }: { totalProfiles: number }) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {[
        {
          label: 'Total Profiles',
          value: totalProfiles,
          icon: <Users className="w-4 h-4" />,
          color: 'text-gold-400',
        },
        {
          label: 'Charts Calculated',
          value: totalProfiles,
          icon: <Star className="w-4 h-4" />,
          color: 'text-blue-400',
        },
        {
          label: 'Events Logged',
          value: '—',
          icon: <Calendar className="w-4 h-4" />,
          color: 'text-emerald-400',
        },
      ].map((stat) => (
        <Card key={stat.label} className="flex items-center gap-4">
          <div className={cn('shrink-0', stat.color)}>{stat.icon}</div>
          <div>
            <p className="text-xl font-bold text-stone-50">{stat.value}</p>
            <p className="text-xs text-stone-500">{stat.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { profiles, isLoading } = useProfiles();

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-50">Dashboard</h1>
          <p className="text-stone-400 text-sm mt-1">
            Your Vedic astrology workspace
          </p>
        </div>
        {profiles.length > 0 && (
          <Link href="/profile/new">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Chart
            </Button>
          </Link>
        )}
      </div>

      {/* Stats bar */}
      {!isLoading && profiles.length > 0 && (
        <StatsBar totalProfiles={profiles.length} />
      )}

      {/* Content */}
      {isLoading ? (
        <div>
          <div className="h-5 w-32 bg-cosmic-elevated rounded animate-pulse mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-stone-200">
              Recent Profiles
            </h2>
            <Link
              href="/profile"
              className="text-xs text-gold-500 hover:text-gold-400 transition-colors duration-150"
            >
              View all →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>

          {/* Quick tips */}
          <Card className="mt-8 border-gold-500/20 bg-gold-500/5" padding="lg">
            <CardHeader>
              <CardTitle className="text-gold-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'View D9 Navamsha', desc: 'Spouse & dharma chart', href: '#' },
                  { label: 'Current Dashas', desc: 'Active planetary periods', href: '#' },
                  { label: 'Check Yogas', desc: 'Planetary combinations', href: '#' },
                  { label: 'Shadbala Strengths', desc: 'Six-fold planetary power', href: '#' },
                ].map((action) => (
                  <div
                    key={action.label}
                    className="flex items-center gap-3 p-3 rounded-lg bg-cosmic-elevated/50 border border-cosmic-border hover:border-stone-600 transition-colors duration-150 cursor-pointer"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-stone-200">{action.label}</p>
                      <p className="text-xs text-stone-500">{action.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
