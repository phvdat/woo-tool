import MainLayout from './MainLayout';
import ErrorBoundary from '@/components/commons/ErrorBoundary';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <MainLayout>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </MainLayout>
  );
}
