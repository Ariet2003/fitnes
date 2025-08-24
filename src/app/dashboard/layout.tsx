import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionTokenEdge } from '@/lib/auth-edge';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_session')?.value;

  if (!token) {
    redirect('/');
  }

  const sessionData = await verifySessionTokenEdge(token);
  if (!sessionData) {
    redirect('/');
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
