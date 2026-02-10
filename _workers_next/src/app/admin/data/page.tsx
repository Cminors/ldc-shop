import { getSetting } from "@/lib/db/queries"
import { AdminDataContent } from "@/components/admin/export-content"

export default async function AdminDataPage() {
  let shopName: string | null = null
  try {
    shopName = await getSetting("shop_name")
  } catch {
    shopName = null
  }

  return <AdminDataContent shopName={shopName} />
}

