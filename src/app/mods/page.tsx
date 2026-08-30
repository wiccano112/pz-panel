import { readIniFile } from '@/lib/serverUtils';
import ModManagerClient from '@/components/ModManagerClient';
 
export const dynamic = 'force-dynamic';
 
export default async function ModsPage() {
  const initialData = await readIniFile();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-white">Mods Manager</h2>
      <ModManagerClient initialData={initialData} />
    </div>
  );
}
