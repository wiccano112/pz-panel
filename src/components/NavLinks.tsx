"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PackagePlus, Sliders, Users } from 'lucide-react';

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/mods', label: 'Mods Manager', icon: PackagePlus },
    { href: '/sandbox', label: 'Sandbox Settings', icon: Sliders },
    { href: '/players', label: 'Players & Moderation', icon: Users },
  ];

  return (
    <nav className="flex flex-col space-y-1.5">
      {links.map((link) => {
        const isActive = pathname === link.href;
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center space-x-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
