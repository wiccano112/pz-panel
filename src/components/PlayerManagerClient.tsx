"use client";

import { useState, useActionState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import useSWR from 'swr';
import {
  Users,
  ShieldCheck,
  Ban,
  Megaphone,
  UserPlus,
  Trash2,
  Send,
  Radio,
  UserX,
  RefreshCw,
  History,
  Search,
  LogIn,
  LogOut,
  MapPin,
} from 'lucide-react';
import { PlayersOverviewData, WhitelistUser, BannedSteamId, BannedIp } from '@/types/players';
import {
  handleAddWhitelistAction,
  handleRemoveWhitelistAction,
  handleBanAction,
  handleUnbanAction,
  handleBroadcastAction,
} from '@/app/actions';
import { PLAYERS_POLL_INTERVAL_MS, ROLE_OPTIONS } from '@/constants/game';

export interface PlayerManagerClientProps {
  initialData: PlayersOverviewData;
}

const VALID_TABS = ['live', 'history', 'whitelist', 'bans', 'broadcast'] as const;
type PlayerTab = typeof VALID_TABS[number];

const fetcher = async (url: string): Promise<PlayersOverviewData> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch player data');
  return res.json();
};

export default function PlayerManagerClient({ initialData }: PlayerManagerClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams.get('tab') as PlayerTab | null;
  const activeTab: PlayerTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'live';

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'CONNECTED' | 'DISCONNECTED'>('ALL');

  const handleTabChange = (tab: PlayerTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Real-time polling via SWR
  const { data, mutate, isValidating } = useSWR<PlayersOverviewData>(
    '/api/players/live',
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: PLAYERS_POLL_INTERVAL_MS,
    }
  );

  const overview = data || initialData;

  // Filtered history list
  const filteredHistory = (overview.connectionHistory || []).filter((event) => {
    if (historyFilter !== 'ALL' && event.type !== historyFilter) return false;
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase().trim();
    return (
      event.username.toLowerCase().includes(q) ||
      (event.steamid && event.steamid.includes(q)) ||
      (event.ip && event.ip.includes(q)) ||
      (event.timestamp && event.timestamp.toLowerCase().includes(q)) ||
      (event.coordinates && event.coordinates.includes(q))
    );
  });

  // Server Actions states
  const [addWhitelistState, addWhitelistAction, addWhitelistPending] = useActionState(handleAddWhitelistAction, null);
  const [, removeWhitelistAction, removeWhitelistPending] = useActionState(handleRemoveWhitelistAction, null);
  const [banState, banAction, banPending] = useActionState(handleBanAction, null);
  const [, unbanAction, unbanPending] = useActionState(handleUnbanAction, null);
  const [broadcastState, broadcastAction, broadcastPending] = useActionState(handleBroadcastAction, null);

  const [banType, setBanType] = useState<'steam' | 'ip'>('steam');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Players & Moderation</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Monitor active survivors, track connection history, manage whitelist, enforce bans, and broadcast messages.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh player lists"
            aria-label="Refresh player lists"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/60 rounded-t-lg px-4 gap-2">
        <button
          onClick={() => handleTabChange('live')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'live'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="View live connected players tab"
        >
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Connected Players</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
            {overview.connectedPlayers.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'history'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="View connection history tab"
        >
          <History className="w-4 h-4 text-sky-400" />
          <span>Connection History</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-sky-950 text-sky-300 border border-sky-800 rounded-full">
            {overview.connectionHistory?.length || 0}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('whitelist')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'whitelist'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="View whitelist management tab"
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Whitelist</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-zinc-800 text-zinc-300 rounded-full">
            {overview.whitelist.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('bans')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'bans'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="View ban moderation tab"
        >
          <Ban className="w-4 h-4 text-rose-400" />
          <span>Bans</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-rose-950 text-rose-300 border border-rose-800 rounded-full">
            {overview.bannedSteamIds.length + overview.bannedIps.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('broadcast')}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'broadcast'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          aria-label="View server broadcast tab"
        >
          <Megaphone className="w-4 h-4 text-amber-400" />
          <span>Server Broadcast</span>
        </button>
      </div>

      {/* Tab 1: Live Connected Players */}
      {activeTab === 'live' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-b-lg p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-white">Active Survivors</h4>
            <span className="text-xs text-zinc-400">Updates live via server polling</span>
          </div>

          {overview.connectedPlayers.length === 0 ? (
            <div className="p-12 text-center border border-zinc-800 rounded-lg text-zinc-500 space-y-2">
              <UserX className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium">No players currently connected to the server.</p>
              <p className="text-xs text-zinc-500">Connected survivors will appear here in real-time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Session</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {overview.connectedPlayers.map((player) => (
                    <tr key={player.username} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-white flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{player.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-zinc-800 border border-zinc-700 text-zinc-300">
                          {player.role || 'Player'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {player.connectedSince || 'Online'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <form action={banAction} className="inline-block">
                          <input type="hidden" name="banType" value="ip" />
                          <input type="hidden" name="target" value={player.username} />
                          <input type="hidden" name="reason" value="Kicked via PZ-Panel" />
                          <button
                            type="submit"
                            disabled={banPending}
                            className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
                            aria-label={`Kick or ban player ${player.username}`}
                          >
                            Kick / Ban
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Connection History */}
      {activeTab === 'history' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-b-lg p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-base font-semibold text-white flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-400" />
                <span>Connection & Session Logs</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Audit trail extracted from server session logs (data/Logs/*_user.txt).
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Filter player, Steam ID, IP..."
                  className="pl-9 pr-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 w-full sm:w-64"
                />
              </div>

              <div className="flex rounded border border-zinc-700 bg-zinc-800 p-0.5 text-xs">
                <button
                  onClick={() => setHistoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    historyFilter === 'ALL'
                      ? 'bg-zinc-700 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setHistoryFilter('CONNECTED')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    historyFilter === 'CONNECTED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Connected
                </button>
                <button
                  onClick={() => setHistoryFilter('DISCONNECTED')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    historyFilter === 'DISCONNECTED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 font-medium'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Disconnected
                </button>
              </div>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center border border-zinc-800 rounded-lg text-zinc-500 space-y-2">
              <History className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-sm font-medium">No connection events found.</p>
              <p className="text-xs text-zinc-500">
                {historySearch ? 'Try adjusting your search criteria.' : 'Player joins and leaves will be logged automatically.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 rounded-lg">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Steam ID</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Coordinates</th>
                    <th className="px-4 py-3 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {filteredHistory.map((event) => (
                    <tr key={event.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        {event.type === 'CONNECTED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                            <LogIn className="w-3 h-3 mr-1 text-emerald-400" />
                            Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-zinc-800/80 text-zinc-400 border border-zinc-700">
                            <LogOut className="w-3 h-3 mr-1 text-zinc-500" />
                            Disconnected
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {event.timestamp}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {event.username}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {event.steamid || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                        {event.ip || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {event.coordinates ? (
                          <span className="inline-flex items-center text-amber-300/90 font-mono text-[11px]">
                            <MapPin className="w-3 h-3 mr-1 text-amber-400 shrink-0" />
                            {event.coordinates}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {event.steamid && (
                          <form action={banAction} className="inline-block">
                            <input type="hidden" name="banType" value="steam" />
                            <input type="hidden" name="target" value={event.steamid} />
                            <input type="hidden" name="reason" value="Banned via History log" />
                            <button
                              type="submit"
                              disabled={banPending}
                              className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title={`Ban Steam ID ${event.steamid}`}
                              aria-label={`Ban Steam ID ${event.steamid}`}
                            >
                              Ban Steam
                            </button>
                          </form>
                        )}
                        {event.ip && (
                          <form action={banAction} className="inline-block">
                            <input type="hidden" name="banType" value="ip" />
                            <input type="hidden" name="target" value={event.ip} />
                            <input type="hidden" name="reason" value="Banned via History log" />
                            <button
                              type="submit"
                              disabled={banPending}
                              className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-xs rounded transition-colors disabled:opacity-50 cursor-pointer"
                              title={`Ban IP ${event.ip}`}
                              aria-label={`Ban IP ${event.ip}`}
                            >
                              Ban IP
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Whitelist Management */}
      {activeTab === 'whitelist' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-b-lg p-6 shadow-xl space-y-6">
          {/* Add user form */}
          <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>Add Player to Whitelist</span>
            </h4>

            <form action={addWhitelistAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Username *</label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="e.g. SurvivorBob"
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Role</label>
                <select
                  name="role"
                  defaultValue="5"
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Steam ID (17 digits, optional)</label>
                <input
                  type="text"
                  name="steamid"
                  placeholder="76561198000000000"
                  maxLength={17}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addWhitelistPending}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Add user to whitelist"
                >
                  {addWhitelistPending ? 'Adding...' : 'Add to Whitelist'}
                </button>
              </div>
            </form>

            {addWhitelistState?.message && (
              <p className={`text-xs ${addWhitelistState.error ? 'text-red-400' : 'text-green-400'}`}>
                {addWhitelistState.message}
              </p>
            )}
          </div>

          {/* Whitelist Table */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-white">Whitelisted Players ({overview.whitelist.length})</h4>

            {overview.whitelist.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No users currently registered in whitelist table.</p>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Steam ID</th>
                      <th className="px-4 py-3">Last Active</th>
                      <th className="px-4 py-3 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {overview.whitelist.map((user: WhitelistUser) => (
                      <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{user.username}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs border ${
                              user.role === 1
                                ? 'bg-amber-950/60 border-amber-800 text-amber-300'
                                : user.role === 2
                                ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                            }`}
                          >
                            {user.roleName}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                          {user.steamid || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {user.lastConnection || 'Never'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form action={removeWhitelistAction}>
                            <input type="hidden" name="id" value={user.id} />
                            <button
                              type="submit"
                              disabled={removeWhitelistPending}
                              className="p-1.5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                              title={`Remove ${user.username} from whitelist`}
                              aria-label={`Remove ${user.username} from whitelist`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Bans & Moderation */}
      {activeTab === 'bans' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-b-lg p-6 shadow-xl space-y-6">
          {/* Ban Form */}
          <div className="p-4 bg-zinc-800/60 border border-zinc-700/80 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>Enforce Ban</span>
            </h4>

            <form action={banAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Ban Type</label>
                <select
                  name="banType"
                  value={banType}
                  onChange={(e) => setBanType(e.target.value as 'steam' | 'ip')}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="steam">Steam ID (17 digits)</option>
                  <option value="ip">IP Address</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {banType === 'steam' ? 'Steam ID *' : 'IP Address *'}
                </label>
                <input
                  type="text"
                  name="target"
                  required
                  placeholder={banType === 'steam' ? '76561198000000000' : '192.168.1.100'}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason</label>
                <input
                  type="text"
                  name="reason"
                  placeholder="Griefing, hacking, etc."
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={banPending}
                  className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Enforce ban on target"
                >
                  {banPending ? 'Enforcing...' : 'Enforce Ban'}
                </button>
              </div>
            </form>

            {banState?.message && (
              <p className={`text-xs ${banState.error ? 'text-red-400' : 'text-green-400'}`}>
                {banState.message}
              </p>
            )}
          </div>

          {/* Banned Steam IDs Table */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-white">Banned Steam IDs ({overview.bannedSteamIds.length})</h4>
            {overview.bannedSteamIds.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No Steam IDs currently banned.</p>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">Steam ID</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-right">Unban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {overview.bannedSteamIds.map((b: BannedSteamId) => (
                      <tr key={b.steamid} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-rose-300">{b.steamid}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{b.reason}</td>
                        <td className="px-4 py-3 text-right">
                          <form action={unbanAction}>
                            <input type="hidden" name="unbanType" value="steam" />
                            <input type="hidden" name="target" value={b.steamid} />
                            <button
                              type="submit"
                              disabled={unbanPending}
                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors cursor-pointer"
                              aria-label={`Unban Steam ID ${b.steamid}`}
                            >
                              Unban
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Banned IPs Table */}
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-white">Banned IP Addresses ({overview.bannedIps.length})</h4>
            {overview.bannedIps.length === 0 ? (
              <p className="text-sm text-zinc-500 italic">No IP addresses currently banned.</p>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="bg-zinc-950 text-xs uppercase text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">Reason</th>
                      <th className="px-4 py-3 text-right">Unban</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {overview.bannedIps.map((b: BannedIp) => (
                      <tr key={b.ip} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-rose-300">{b.ip}</td>
                        <td className="px-4 py-3 text-xs text-zinc-300">{b.username || '—'}</td>
                        <td className="px-4 py-3 text-xs text-zinc-400">{b.reason}</td>
                        <td className="px-4 py-3 text-right">
                          <form action={unbanAction}>
                            <input type="hidden" name="unbanType" value="ip" />
                            <input type="hidden" name="target" value={b.ip} />
                            <button
                              type="submit"
                              disabled={unbanPending}
                              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded border border-zinc-700 transition-colors cursor-pointer"
                              aria-label={`Unban IP ${b.ip}`}
                            >
                              Unban
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Server Broadcast Announcement */}
      {activeTab === 'broadcast' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-b-lg p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-5 h-5 text-amber-400" />
            <h4 className="text-base font-semibold text-white">Broadcast Announcement to In-Game Chat</h4>
          </div>
          <p className="text-xs text-zinc-400">
            Sends an official server message appearing directly in the global in-game chat for all currently connected survivors.
          </p>

          <form action={broadcastAction} className="space-y-3 pt-2">
            <div>
              <textarea
                name="message"
                required
                rows={3}
                placeholder="Attention survivors: Server restarting in 5 minutes for maintenance..."
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={broadcastPending}
                className="flex items-center space-x-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                aria-label="Send broadcast announcement"
              >
                <Send className="w-4 h-4" />
                <span>{broadcastPending ? 'Sending...' : 'Send Broadcast'}</span>
              </button>

              {broadcastState?.message && (
                <span className={`text-xs font-medium ${broadcastState.error ? 'text-red-400' : 'text-green-400'}`}>
                  {broadcastState.message}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
