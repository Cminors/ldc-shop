import { cleanupExpiredCardsIfNeeded, getProducts, getSetting, getLiveCardStats } from "@/lib/db/queries"
import { cookies } from "next/headers"
import { AdminProductsContent } from "@/components/admin/products-content"
import { INFINITE_STOCK } from "@/lib/constants"

export default async function AdminPage() {
    await cookies()
    try {
        await cleanupExpiredCardsIfNeeded()
    } catch {
        // best effort
    }
    const [products, lowStockThreshold] = await Promise.all([
        getProducts(),
        (async () => {
            try {
                const v = await getSetting('low_stock_threshold')
                return Number.parseInt(v || '5', 10) || 5
            } catch {
                return 5
            }
        })(),
    ])

    const liveStats = await getLiveCardStats(products.map((p: any) => p.id)).catch(() => new Map())

    return (
        <AdminProductsContent
            products={products.map((p: any) => {
                const stat = liveStats.get(p.id) || { unused: 0, available: 0, locked: 0 }
                const available = p.isShared
                    ? (stat.unused > 0 ? INFINITE_STOCK : 0)
                    : stat.available
                const locked = stat.locked
                const stockCount = available >= INFINITE_STOCK ? INFINITE_STOCK : (available + locked)
                return {
                id: p.id,
                name: p.name,
                price: p.price,
                compareAtPrice: p.compareAtPrice ?? null,
                category: p.category,
                stockCount,
                isActive: p.isActive ?? true,
                isHot: p.isHot ?? false,
                sortOrder: p.sortOrder ?? 0
            }})}
            lowStockThreshold={lowStockThreshold}
        />
    )
}
