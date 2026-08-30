"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavLinks() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/mods', label: 'Mods Manager' },
  ];

  return (
    <nav className="flex flex-col space-y-2">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-md transition-colors ${
              isActive ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'hover:bg-zinc-700 text-zinc-100'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
