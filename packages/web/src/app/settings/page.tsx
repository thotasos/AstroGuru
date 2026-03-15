import type { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Settings, Database, Globe, Palette } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Settings',
};

interface SettingRowProps {
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-cosmic-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-200">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-6 h-6 text-gold-400" />
        <div>
          <h1 className="text-2xl font-bold text-stone-50">Settings</h1>
          <p className="text-stone-400 text-sm mt-1">Application preferences and configuration</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Astrology Settings */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gold-400" />
              Astrology Defaults
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Default Ayanamsa"
              description="Applied to all new chart calculations"
            >
              <select className="input-base w-32 text-sm py-1.5">
                <option value="Lahiri">Lahiri</option>
                <option value="Raman">Raman</option>
                <option value="KP">KP</option>
              </select>
            </SettingRow>
            <SettingRow
              label="House System"
              description="Parashari whole-sign system is standard"
            >
              <select className="input-base w-36 text-sm py-1.5">
                <option value="whole">Whole Sign</option>
                <option value="placidus">Placidus</option>
              </select>
            </SettingRow>
            <SettingRow
              label="Chart Style"
              description="South Indian (fixed signs) or North Indian (fixed houses)"
            >
              <select className="input-base w-36 text-sm py-1.5">
                <option value="south">South Indian</option>
                <option value="north">North Indian</option>
              </select>
            </SettingRow>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gold-400" />
              Display
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="Show degrees in chart"
              description="Display degree and minute within sign cells"
            >
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input type="checkbox" className="sr-only" defaultChecked />
                  <div className="w-10 h-6 bg-gold-500 rounded-full" />
                  <div className="absolute top-1 left-5 w-4 h-4 bg-stone-950 rounded-full transition-transform" />
                </div>
              </label>
            </SettingRow>
            <SettingRow
              label="Timeline date range"
              description="Years of dasha history to display"
            >
              <select className="input-base w-28 text-sm py-1.5">
                <option value="all">All 120y</option>
                <option value="50">±50 years</option>
                <option value="25">±25 years</option>
              </select>
            </SettingRow>
          </CardContent>
        </Card>

        {/* API / Data */}
        <Card padding="lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-4 h-4 text-gold-400" />
              API & Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SettingRow
              label="API Server URL"
              description="Fastify API backend (proxied via Next.js)"
            >
              <span className="text-xs text-stone-500 font-mono bg-cosmic-elevated px-2 py-1 rounded border border-cosmic-border">
                localhost:3001
              </span>
            </SettingRow>
            <SettingRow
              label="Ephemeris precision"
              description="Swiss Ephemeris calculation precision"
            >
              <select className="input-base w-28 text-sm py-1.5">
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </SettingRow>
          </CardContent>
        </Card>

        {/* About */}
        <Card padding="lg" className="border-cosmic-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <span className="text-gold-400 font-bold text-sm">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-200">Parashari Precision</p>
              <p className="text-xs text-stone-500">v1.0.0 · Next.js 15 · Fastify · Swiss Ephemeris</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
