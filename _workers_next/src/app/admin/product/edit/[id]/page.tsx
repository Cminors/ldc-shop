import ProductForm from "@/components/admin/product-form"
import { getCategories, getProductForAdmin } from "@/lib/db/queries"
import { notFound } from "next/navigation"
import { unstable_noStore } from "next/cache"
import { RefreshOnMount } from "@/components/refresh-on-mount"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    unstable_noStore()
    const { id } = await params
    const product = await getProductForAdmin(id)
    const categories = await getCategories()

    if (!product) return notFound()

    return (
        <>
            <RefreshOnMount />
            <ProductForm product={product} categories={categories} />
        </>
    )
}
