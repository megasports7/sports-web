import { Card, type AccentColor } from './Card';

export function StatTile({
  value,
  label,
  accent = 'none',
}: {
  value: number | string;
  label: string;
  accent?: AccentColor;
}) {
  return (
    <Card accent={accent}>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </Card>
  );
}
