import { getCategories } from "@/lib/db/queries"
import { AdminCategoriesContent } from "@/components/admin/categories-content"
import { unstable_noStore } from "next/cache"

export default async function AdminCategoriesPage() {
  unstable_noStore()
  const categories = await getCategories()
  return <AdminCategoriesContent categories={categories} />
}
