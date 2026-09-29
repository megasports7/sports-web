'use client';

/**
 * Secretary portal section shell for the Players / Events pages (both
 * portals): portal loader + title once, content per page.
 */
import { useSecretaryPortal } from '@/components/secretary/useSecretaryEvent';
import type { SecretaryKind } from '@/lib/api/secretary.api';

export function PortalSectionPage({
  kind,
  title,
  bare,
  children,
}: {
  kind: SecretaryKind;
  title: string;
  /** Skip the built-in h1 when the section renders its own approved header. */
  bare?: boolean;
  children: (data: ReturnType<typeof useSecretaryPortal>) => React.ReactNode;
}) {
  const data = useSecretaryPortal(kind);

  if (data.loading) return <p className="text-muted">Loading {title.toLowerCase()}…</p>;

  return (
    <div className="section-page">
      {!bare && <h1>{title}</h1>}
      {children(data)}
      <style jsx>{`
        .section-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .section-page h1 {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
