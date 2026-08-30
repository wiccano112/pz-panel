export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 bg-zinc-900 border border-zinc-800 rounded-lg" />
      <div className="h-10 w-64 bg-zinc-900 border border-zinc-800 rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-zinc-900 border border-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
