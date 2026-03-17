import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/globals.css';
import { Sidebar } from '@/components/ui/Sidebar';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0C0A09',
};

export const metadata: Metadata = {
  title: {
    default: 'Parashari Precision',
    template: '%s | Parashari Precision',
  },
  description: 'Professional Vedic Astrology — South Indian Charts, Vimshottari Dashas, Yogas & Shadbala',
  keywords: ['Vedic astrology', 'Jyotish', 'South Indian chart', 'Vimshottari dasha', 'Parashari'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${dmSans.variable} font-sans bg-[#0C0A09] text-stone-50 antialiased`}
        suppressHydrationWarning
      >
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
