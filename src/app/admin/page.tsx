import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import { Dashboard } from '@/components/admin/Dashboard';
export const dynamic='force-dynamic';
export default async function Page(){if(!await currentAdmin())redirect('/admin/login');return <Dashboard/>}
