'use client';

/**
 * Direct close port of sports-mobile-main/src/screens/associate/
 * AssociateDashboard.tsx -- the roster/attendance manager that is
 * associate's whole real job in mobile. Scope toggle auto-refetches (mirrors
 * mobile's useFocusEffect-on-scope-change); date/search apply on a button
 * click, matching mobile's own ref-based "don't refetch on every keystroke"
 * behavior (achieved here just by not listing them as effect deps, rather
 * than mobile's ref workaround, which exists only because of React
 * Navigation's useFocusEffect semantics -- not needed here).
 *
 * NOT ported: the "Scan QR" button -- it navigates to a screen
 * (ScanAttendanceAssociate) that is registered nowhere in the mobile source,
 * a dead button in the shipped app, not a deferred-but-real feature.
 *
 * CSV export IS ported -- a plain client-side Blob download, no backend
 * dependency, works normally in a real deployed browser (unlike an Artifact
 * preview sandbox, which this app is not).
 */
import { useEffect, useState } from 'react';
import { associateApi } from '@/lib/api/associate.api';
import type { AssociatePlayer } from '@/lib/types';

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AssociateAttendancePage() {
  const [scope, setScope] = useState<'district' | 'state'>('district');
  const [date, setDate] = useState(getTodayDate());
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<AssociatePlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  // Fires on mount and whenever `scope` changes -- date/search are read from
  // their current state at that moment (always fresh, since this closure is
  // rebuilt every render) but deliberately not listed as deps, so typing in
  // either field doesn't refetch until "Apply filters" is clicked.
  useEffect(() => {
    associateApi
      .getPlayers({ scope, date, search })
      .then((res) => {
        if (res.success && res.data) {
          setPlayers(res.data.players);
          setTotal(res.data.total);
          setPresentCount(res.data.present);
          setAbsentCount(res.data.absent);
          setError(null);
        } else {
          setError(res.message || 'Could not load players');
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  async function handleApplyFilters() {
    setLoading(true);
    const res = await associateApi.getPlayers({ scope, date, search });
    setLoading(false);
    if (res.success && res.data) {
      setPlayers(res.data.players);
      setTotal(res.data.total);
      setPresentCount(res.data.present);
      setAbsentCount(res.data.absent);
      setError(null);
    } else {
      setError(res.message || 'Could not load players');
    }
  }

  async function handleMarkAttendance(player: AssociatePlayer) {
    setMarking(player.id);
    const newPresent = !player.present;
    const res = await associateApi.markAttendance(player.id, newPresent, date);
    setMarking(null);
    if (res.success) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === player.id ? { ...p, present: newPresent, absent: !newPresent } : p)),
      );
      setPresentCount((prev) => (newPresent ? prev + 1 : Math.max(0, prev - 1)));
      setAbsentCount((prev) => (newPresent ? Math.max(0, prev - 1) : prev + 1));
    } else {
      setError(res.message || 'Failed to update attendance');
    }
  }

  function handleDownloadCsv(type: 'attended' | 'not_attended') {
    const list = type === 'attended' ? players.filter((p) => p.present) : players.filter((p) => !p.present);
    if (list.length === 0) return;

    const header = '#,Name,Phone,Email,Sport,ID Number,District,State,Status';
    const rows = list.map((p, i) => {
      // Same null-safety as mobile's own 2026-09-05 fix -- p.player_id
      // (legacy_id) is null for every self-signup player; fall back to a
      // slice of the real uuid instead of interpolating the literal "null".
      const displayId = p.id_number || (p.player_id != null ? p.player_id : p.id.slice(0, 8));
      return `${i + 1},"${p.player_name}","${p.phone ?? ''}","${p.email}","${p.sport ?? ''}","${displayId}","${p.district ?? ''}","${p.state ?? ''}","${type === 'attended' ? 'Present' : 'Absent'}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${type}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h1 className="text-lg font-bold">Attendance</h1>
        <p className="text-sm text-gray-500">Mark player attendance for your district/state.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Scope</label>
          <div className="mt-1 flex gap-2">
            {(['district', 'state'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize ${
                  scope === s ? 'border-black bg-black text-white' : 'border-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Search (name / phone / email / ID)
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players…"
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <button
          onClick={handleApplyFilters}
          className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white"
        >
          Apply filters
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => handleDownloadCsv('attended')}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium"
          >
            Download attended
          </button>
          <button
            onClick={() => handleDownloadCsv('not_attended')}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium"
          >
            Download not attended
          </button>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xl font-bold text-green-700">{presentCount}</div>
          <div className="text-xs text-gray-500">Present</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xl font-bold text-orange-700">{absentCount}</div>
          <div className="text-xs text-gray-500">Absent</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
          <div className="text-xl font-bold">{total}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && players.length === 0 ? (
        <p className="text-gray-500">Loading players…</p>
      ) : players.length === 0 ? (
        <p className="text-sm text-gray-500">No players found for this scope/date/search.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {players.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                p.present ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-xs text-gray-400">{i + 1}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.player_name || '—'}</div>
                  <div className="truncate text-xs text-gray-500">
                    {p.phone} · {p.email}
                  </div>
                  <div className="truncate text-xs text-gray-400">
                    {p.sport} · ID: {p.id_number || p.player_id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleMarkAttendance(p)}
                disabled={marking === p.id}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                  p.present ? 'bg-green-600' : 'bg-gray-400'
                }`}
              >
                {marking === p.id ? '…' : p.present ? 'Present' : 'Absent'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
