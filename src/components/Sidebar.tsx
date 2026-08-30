import NavLinks from './NavLinks';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-6">PZ-Panel</h1>
      <NavLinks />
    </aside>
  );
}
