export default function SandboxLoading() {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 space-y-6 animate-pulse">
      <div className="h-6 bg-zinc-800 rounded w-1/4" />
      <div className="h-10 bg-zinc-800 rounded w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-zinc-800 rounded-md" />
        ))}
      </div>
    </div>
  );
}
