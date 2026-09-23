'use client';

/**
 * Split step 2: registrations section (moved verbatim from EventDetail).
 * Approvals table with status filter; review actions call the audited
 * review_registration RPC (gated on verify_players).
 */
import { useEffect, useState } from 'react';
import { secretaryApi, type SecretaryRegistration } from '@/lib/api/secretary.api';
import { SecretaryStyles } from '@/components/secretary/SecretaryStyles';

export function RegistrationsSection({
  eventId,
  canReview,
}: {
  eventId: string;
  canReview: boolean;
}) {
  const [regs, setRegs] = useState<SecretaryRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    secretaryApi.registrations(eventId).then((rRes) => {
      if (rRes.success && rRes.data) {
        setRegs(rRes.data);
        setError(null);
      } else {
        setError(rRes.message || 'Could not load registrations');
      }
      setLoading(false);
    });
  }, [eventId]);

  async function decide(reg: SecretaryRegistration, decision: 'approved' | 'rejected' | 'overridden') {
    let reason: string | null = null;
    if (decision === 'overridden') {
      reason = window.prompt('Override reason (required, recorded in audit):');
      if (!reason || !reason.trim()) return;
    } else if (decision === 'rejected') {
      if (!window.confirm(`Reject ${reg.player_name}'s registration?`)) return;
    }
    setActing(reg.id);
    const res = await secretaryApi.reviewRegistration(reg.id, decision, reason ?? undefined);
    if (res.success) {
      const status = decision === 'overridden' ? 'overridden' : decision;
      setRegs((prev) => prev.map((r) => (r.id === reg.id ? { ...r, status } : r)));
      setError(null);
    } else {
      setError(res.message || 'Review failed');
    }
    setActing(null);
  }

  if (loading) return <p className="text-muted">Loading registrations…</p>;

  const visible = regs.filter((r) => filter === 'all' || r.status === filter);

  return (
    <div className="card">
      <h2>
        Registrations ({visible.length}/{regs.length})
      </h2>
      {error && <p className="text-error">{error}</p>}
      <div className="filters">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'on' : ''}>
            {f}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-muted">No registrations in this view.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Status</th>
              {canReview && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id}>
                <td>{r.player_name}</td>
                <td>
                  <span className={`status status-${r.status}`}>{r.status}</span>
                </td>
                {canReview && (
                  <td className="actions">
                    <button disabled={acting === r.id} onClick={() => decide(r, 'approved')}>
                      Approve
                    </button>
                    <button disabled={acting === r.id} onClick={() => decide(r, 'rejected')}>
                      Reject
                    </button>
                    <button disabled={acting === r.id} onClick={() => decide(r, 'overridden')}>
                      Override
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!canReview && (
        <p className="text-muted">Review actions need the verify_players permission — ask an admin.</p>
      )}
      <SecretaryStyles />
    </div>
  );
}
