import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { and, desc, eq, or, sql } from "drizzle-orm"
import { AdminOrdersContent } from "@/components/admin/orders-content"
import { cancelExpiredOrders, normalizeTimestampMs, withOrderColumnFallback } from "@/lib/db/queries"
import { PAYMENT_PRODUCT_ID } from "@/lib/payment"
import { unstable_noStore } from "next/cache"

function parseIntParam(value: unknown, fallback: number) {
    const num = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
    return Number.isFinite(num) && num > 0 ? num : fallback
}

function firstParam(value: string | string[] | undefined): string | undefined {
    if (!value) return undefined
    return Array.isArray(value) ? value[0] : value
}

export default async function AdminOrdersPage(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    unstable_noStore()
    const searchParams = await props.searchParams
    try {
        await cancelExpiredOrders()
    } catch {
        // Best effort cleanup
    }

    const q = (firstParam(searchParams.q) || '').trim()
    const status = (firstParam(searchParams.status) || 'all').trim()
    const page = parseIntParam(firstParam(searchParams.page), 1)
    const pageSize = Math.min(parseIntParam(firstParam(searchParams.pageSize), 50), 200)

    const whereParts: any[] = []
    if (status !== 'all') {
        whereParts.push(eq(orders.status, status))
    }
    if (q) {
        const like = `%${q}%`
        whereParts.push(or(
            sql`${orders.orderId} LIKE ${like}`,
            sql`${orders.productName} LIKE ${like}`,
            sql`COALESCE(${orders.username}, '') LIKE ${like}`,
            sql`COALESCE(${orders.email}, '') LIKE ${like}`,
            sql`COALESCE(${orders.tradeNo}, '') LIKE ${like}`
        ))
    }
    const whereExpr = whereParts.length ? and(...whereParts) : undefined

    const offset = (page - 1) * pageSize

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(orders)
    const countResPromise = whereExpr ? countQuery.where(whereExpr as any) : countQuery

    const [rows, countRes] = await withOrderColumnFallback(async () => {
        return await Promise.all([
            db.query.orders.findMany({
                where: whereExpr,
                orderBy: [desc(normalizeTimestampMs(orders.createdAt))],
                limit: pageSize,
                offset,
            }),
            countResPromise,
        ])
    })

    const total = countRes[0]?.count || 0

    return (
        <AdminOrdersContent
            orders={rows.map((o: any) => ({
                orderId: o.orderId,
                username: o.username,
                email: o.email,
                productName: o.productName,
                amount: o.amount,
                status: o.status,
                cardKey: o.cardKey,
                tradeNo: o.tradeNo,
                createdAt: o.createdAt
            }))}
            total={total}
            page={page}
            pageSize={pageSize}
            query={q}
            status={status}
        />
    )
}
