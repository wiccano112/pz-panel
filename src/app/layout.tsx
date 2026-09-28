import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { UnsavedChangesProvider } from "@/context/UnsavedChangesContext";
import { getGameVersion } from "@/lib/serverUtils";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PZ-Panel",
  description: "Project Zomboid Server Management Panel",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const gameVersion = await getGameVersion();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col md:flex-row bg-zinc-950 text-white">
        <UnsavedChangesProvider>
          <MobileNav gameVersion={gameVersion} />
          <Sidebar gameVersion={gameVersion} />
          <main className="flex-1 p-3 sm:p-6 flex flex-col min-w-0">
            {children}
          </main>
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
