const STATUS_STYLE: Record<string, { bg: string; label: string }> = {
  scheduled: { bg: 'bg-muted', label: 'Scheduled' },
  in_progress: { bg: 'bg-accent-blue', label: 'In progress' },
  completed: { bg: 'bg-accent-green', label: 'Completed' },
  pending: { bg: 'bg-status-pending', label: 'Pending' },
  approved: { bg: 'bg-accent-green', label: 'Approved' },
  rejected: { bg: 'bg-corner-red', label: 'Rejected' },
  present: { bg: 'bg-accent-blue', label: 'Present' },
};

/** A small colored pill for any status value used across registrations,
 *  matches, and batches. Falls back to the raw status string (capitalized
 *  by the browser's own text, not forced) for any value not in the map,
 *  so a genuinely new status never renders blank. */
export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: 'bg-muted', label: status };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${s.bg}`}>{s.label}</span>
  );
}
