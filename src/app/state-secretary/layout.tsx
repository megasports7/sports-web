import { SecretaryShellHost } from '@/components/secretary/SecretaryShellHost';

export default function StateSecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <SecretaryShellHost kind="state_secretary" basePath="/state-secretary">
      {children}
    </SecretaryShellHost>
  );
}
