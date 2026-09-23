'use client';

/**
 * Split step 2: certificates section (moved from EventDetail). Batch
 * groups with real batch names from matches, player names resolved via
 * the Hotfix F participant policy, issue block gated on certificate_ops.
 */
import { useEffect, useState } from 'react';
import { secretaryApi } from '@/lib/api/secretary.api';
import { SecretaryStyles } from '@/components/secretary/SecretaryStyles';

export function CertificatesSection({
  eventId,
  canIssueCerts,
}: {
  eventId: string;
  canIssueCerts: boolean;
}) {
  const [matches, setMatches] = useState<Record<string, unknown>[]>([]);
  const [certs, setCerts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([secretaryApi.eventMatches(eventId), secretaryApi.eventCertificates(eventId)]).then(
      ([mRes, cRes]) => {
        if (mRes.success && mRes.data) setMatches(mRes.data);
        if (cRes.success && cRes.data) setCerts(cRes.data);
        if (!mRes.success) setError(mRes.message || 'Could not load matches');
        else if (!cRes.success) setError(cRes.message || 'Could not load certificates');
        else setError(null);
        setLoading(false);
      },
    );
  }, [eventId]);

  if (loading) return <p className="text-muted">Loading certificates…</p>;

  const batchNameById = new Map<string, string>();
  for (const m of matches) {
    const bid = m.batch_id as string;
    if (bid && !batchNameById.has(bid)) batchNameById.set(bid, (m.batch_name as string) || `Batch ${bid.slice(0, 8)}`);
  }
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const c of certs) {
    const key = (c.batch_id as string) ?? 'event';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  return (
    <div className="certs">
      {error && <p className="text-error">{error}</p>}
      <div className="card">
        <h2>Issue certificates</h2>
        {canIssueCerts ? (
          <CertIssueBlock
            batchNameById={batchNameById}
            onIssued={async () => {
              const cRes = await secretaryApi.eventCertificates(eventId);
              if (cRes.success && cRes.data) setCerts(cRes.data);
            }}
            onError={setError}
          />
        ) : (
          <p className="text-muted">Certificate issuance needs the certificate_ops permission — ask an admin.</p>
        )}
      </div>
      <div className="card">
        <h2>Certificates ({certs.length})</h2>
        {certs.length === 0 ? (
          <p className="text-muted">No certificates issued for this event yet.</p>
        ) : (
          Array.from(groups.entries()).map(([bid, cs]) => (
            <div key={bid} className="batch-group">
              <h3>{batchNameById.get(bid) ?? (bid === 'event' ? 'Event scope' : `Batch ${bid.slice(0, 8)}`)}</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Position</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {cs.map((c) => (
                    <tr key={c.id as string}>
                      <td>{String(c.player_name ?? '—')}</td>
                      <td>
                        <span className={`status status-${String(c.position ?? '')}`}>{String(c.position ?? '—')}</span>
                      </td>
                      <td>{String(c.category_name ?? '—')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
      <SecretaryStyles />
    </div>
  );
}

function CertIssueBlock({
  batchNameById,
  onIssued,
  onError,
}: {
  batchNameById: Map<string, string>;
  onIssued: () => void;
  onError: (msg: string | null) => void;
}) {
  const [batchId, setBatchId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const batchIds = Array.from(batchNameById.keys());
  const selected = batchIds.includes(batchId) ? batchId : '';
  if (batchIds.length === 0) return <p className="text-muted">No batches yet — create one from the Batches page first.</p>;
  return (
    <div className="batch-create" style={{ marginBottom: 12 }}>
      <select value={selected} onChange={(e) => setBatchId(e.target.value)} aria-label="Batch">
        <option value="">Select batch</option>
        {batchIds.map((b) => (
          <option key={b} value={b}>
            {batchNameById.get(b)}
          </option>
        ))}
      </select>
      <button
        disabled={issuing || !selected}
        onClick={async () => {
          setIssuing(true);
          const res = await secretaryApi.issueCertificates(selected);
          setIssuing(false);
          if (res.success) {
            onError(null);
            onIssued();
          } else {
            onError(res.message || 'Certificate issuance failed');
          }
        }}
      >
        {issuing ? 'Issuing…' : 'Issue certificates'}
      </button>
    </div>
  );
}
