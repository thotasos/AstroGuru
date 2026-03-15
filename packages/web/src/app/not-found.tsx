import Link from 'next/link';
import { Home, Star } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-gold-500/5 border border-gold-500/10 flex items-center justify-center mx-auto mb-6">
          <Star className="w-9 h-9 text-gold-500/30" />
        </div>
        <h1 className="text-4xl font-bold text-stone-600 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-stone-300 mb-3">Page not found</h2>
        <p className="text-stone-500 text-sm mb-8">
          This celestial body has wandered beyond our visible horizon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold-500 text-stone-950 font-semibold text-sm hover:bg-gold-400 transition-colors duration-150"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
