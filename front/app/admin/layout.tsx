import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { AdminLayoutClient } from '@/components/cms/admin-layout-client'

export const metadata: Metadata = {
   title: 'Admin',
}

export default function AdminLayout({ children }: { children: ReactNode }) {
   return <AdminLayoutClient>{children}</AdminLayoutClient>
}
