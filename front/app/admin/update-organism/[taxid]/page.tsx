import { OrganismFormClient } from '@/components/cms/organism/organism-form-client'

export default async function AdminUpdateOrganismPage({ params }: { params: Promise<{ taxid: string }> }) {
   const { taxid } = await params
   return <OrganismFormClient taxid={taxid} />
}
