'use client';

import Link from 'next/link';
import { Plus, Search, User } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useProfiles } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';

export default function ProfilesPage() {
  const { profiles, isLoading } = useProfiles();
  const [search, setSearch] = useState('');

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.locationName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-50">Profiles</h1>
          <p className="text-stone-400 text-sm mt-1">
            {profiles.length} chart{profiles.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Link href="/profile/new">
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
            New Chart
          </Button>
        </Link>
      </div>

      {/* Search */}
      {profiles.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
          <input
            type="text"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-cosmic-surface border border-cosmic-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && profiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gold-500/5 border border-gold-500/10 flex items-center justify-center mb-4">
            <User className="w-7 h-7 text-gold-500/40" />
          </div>
          <h2 className="text-lg font-semibold text-stone-300 mb-2">No profiles yet</h2>
          <p className="text-stone-500 text-sm mb-6">Create your first Vedic natal chart to get started.</p>
          <Link href="/profile/new">
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
              Create Profile
            </Button>
          </Link>
        </div>
      )}

      {/* Profile list */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((profile) => (
            <Link key={profile.id} href={`/profile/${profile.id}`}>
              <Card hoverable className="hover:border-gold-500/30 group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center shrink-0">
                    <span className="text-gold-400 font-semibold">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-stone-50 text-sm">{profile.name}</h3>
                      <Badge variant="active" size="sm">{profile.ayanamsaId}</Badge>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {formatDate(profile.dateOfBirth)} · {profile.locationName}
                    </p>
                  </div>
                  <span className="text-xs text-gold-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    View →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* No results after search */}
      {!isLoading && profiles.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          No profiles matching "{search}"
        </div>
      )}
    </div>
  );
}
