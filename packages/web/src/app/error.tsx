'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Parashari Precision] Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-stone-50 mb-2">Something went wrong</h1>
        <p className="text-stone-400 text-sm mb-6 leading-relaxed">
          {error.message || 'An unexpected error occurred. The Parashari engine may need to restart.'}
        </p>
        {error.digest && (
          <p className="text-xs text-stone-600 font-mono mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <Button
          variant="primary"
          onClick={reset}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}
