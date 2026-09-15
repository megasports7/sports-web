import { RefereeNav } from './RefereeNav';

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-bg"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(22,24,29,0.045) 1px, transparent 0)',
        backgroundSize: '22px 22px',
      }}
    >
      <RefereeNav />
      <div className="mx-auto max-w-5xl px-9 py-7">{children}</div>
    </div>
  );
}
