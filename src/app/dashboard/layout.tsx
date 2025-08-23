import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionTokenEdge } from '@/lib/auth-edge';

export default async function DashboardLayout({
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
    <div className="min-h-screen bg-gray-900">
      {children}
    </div>
  );
}
