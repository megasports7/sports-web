import { OrganizerNav } from './OrganizerNav';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <OrganizerNav />
      <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
    </div>
  );
}
