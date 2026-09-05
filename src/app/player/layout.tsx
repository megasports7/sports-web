import { PlayerNav } from './PlayerNav';

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PlayerNav />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
