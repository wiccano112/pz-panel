export default function PlayersLoading() {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-zinc-800 rounded w-1/3" />
      <div className="h-12 bg-zinc-800 rounded w-full" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-zinc-800 rounded-md" />
        ))}
      </div>
    </div>
  );
}
