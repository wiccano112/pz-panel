export default function WorldsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div className="h-6 bg-zinc-800 rounded w-1/3" />
        <div className="h-24 bg-zinc-800 rounded w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 bg-zinc-900 border border-zinc-800 rounded-lg p-5" />
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-4">
        <div className="h-5 bg-zinc-800 rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
