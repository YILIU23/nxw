import { currentAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/admin/LoginForm';
export const dynamic='force-dynamic';
export default async function Page(){if(await currentAdmin())redirect('/admin');return <LoginForm/>}
