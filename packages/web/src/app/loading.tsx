export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-cosmic-border" />
          <div className="absolute inset-0 rounded-full border-t-2 border-gold-500 animate-spin" />
        </div>
        <p className="text-sm text-stone-500">Loading...</p>
      </div>
    </div>
  );
}
