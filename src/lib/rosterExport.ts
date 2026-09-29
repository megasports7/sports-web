import type { SecretaryPlayer } from '@/lib/api/secretary.api';

function text(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function dash(value: string | null): string {
  return value ?? '—';
}

function safeFilePart(value: string): string {
  return value.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'district';
}

/** Downloads the full in-jurisdiction roster as an xlsx sheet (all rows, not just visible). */
export async function downloadRosterWorkbook(players: SecretaryPlayer[], scopeLabel: string): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = players.map((p, index) => ({
    'S. No.': index + 1,
    Name: text(p.name),
    Email: text(p.email),
    Phone: dash(p.phone),
    Sport: dash(p.sport),
    State: dash(p.state),
    District: dash(p.district),
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 32 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 22 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Players');
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = `${safeFilePart(scopeLabel)}_players.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
