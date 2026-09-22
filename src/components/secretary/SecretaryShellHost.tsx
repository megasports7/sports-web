'use client';

/**
 * Client host mounted by both secretary layouts: resolves the caller's scope
 * once (kind is fixed by which route tree mounted this) and renders the
 * shared shell around the page. A wrong-kind visitor (e.g. a state secretary
 * opening /district-secretary) sees an explicit notice -- RLS would return
 * them no rows anyway, so this is UX, not security.
 */
import { useEffect, useState } from 'react';
import { secretaryApi, type SecretaryKind, type SecretaryScope } from '@/lib/api/secretary.api';
import { SecretaryShell } from './SecretaryShell';

const ACCENT: Record<SecretaryKind, string> = {
  district_secretary: 'var(--color-role-district-secretary)',
  state_secretary: 'var(--color-role-state-secretary)',
};

export function SecretaryShellHost({
  kind,
  basePath,
  children,
}: {
  kind: SecretaryKind;
  basePath: string;
  children: React.ReactNode;
}) {
  const [scope, setScope] = useState<SecretaryScope | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    secretaryApi.scope().then((res) => {
      if (res.success && res.data && res.data.kind === kind) setScope(res.data);
      else setFailed(true);
    });
  }, [kind]);

  if (failed)
    return <p className="text-error" style={{ padding: 36 }}>This area is for {kind.replace(/_/g, ' ')} accounts.</p>;
  if (!scope) return <p className="text-muted" style={{ padding: 36 }}>Loading scope…</p>;

  return (
    <SecretaryShell kind={kind} basePath={basePath} scopeLabel={scope.label} accentVar={ACCENT[kind]}>
      {children}
    </SecretaryShell>
  );
}
