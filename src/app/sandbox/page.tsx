import { readSandboxVars } from '@/lib/sandboxUtils';
import SandboxManagerClient from '@/components/SandboxManagerClient';

export const dynamic = 'force-dynamic';

export default async function SandboxPage() {
  const initialVars = await readSandboxVars();

  return (
    <div>
      <SandboxManagerClient initialVars={initialVars} />
    </div>
  );
}
