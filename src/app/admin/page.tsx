'use client'

import { AppProvider } from '@/contexts/AppContext';
import LessonAdministration from '@/components/admin/LessonAdministration';

export default function AdminPage() {
  return (
    <AppProvider>
      <LessonAdministration />
    </AppProvider>
  );
}