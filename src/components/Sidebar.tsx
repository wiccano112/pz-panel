import NavLinks from './NavLinks';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-900 text-white p-4 flex flex-col border-r border-zinc-800">
      <h1 className="text-xl font-bold mb-6">PZ-Panel</h1>
      <NavLinks />
    </aside>
  );
}
