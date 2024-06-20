import type { Metadata } from 'next';
import ProtectedRoute from '@/components/ProtectedRoute';
import { WorkspaceProvider } from '@/context/WorkspaceContext';

export const metadata: Metadata = {
  title: 'Irmin',
  description: 'A better home for your data',
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </ProtectedRoute>
  );
}
