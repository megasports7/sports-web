import { SecretaryShellHost } from '@/components/secretary/SecretaryShellHost';

export default function DistrictSecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <SecretaryShellHost kind="district_secretary" basePath="/district-secretary">
      {children}
    </SecretaryShellHost>
  );
}
