import { AppProvider } from '@/contexts/AppContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function FreehandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppProvider>
        {children}
      </AppProvider>
    </AuthGuard>
  );
}
