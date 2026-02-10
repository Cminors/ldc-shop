import { db } from "@/lib/db"
import { cards } from "@/lib/db/schema"
import { desc, sql } from "drizzle-orm"
import { cleanupExpiredCardsIfNeeded, getProductForAdmin } from "@/lib/db/queries"
import { notFound } from "next/navigation"
import { CardsContent } from "@/components/admin/cards-content"

export default async function CardsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const product = await getProductForAdmin(id)
    if (!product) return notFound()

    // Get Unused Cards
    let unusedCards: any[] = []
    try {
        await cleanupExpiredCardsIfNeeded(undefined, id)
        unusedCards = await db.select()
            .from(cards)
            .where(sql`${cards.productId} = ${id} AND COALESCE(${cards.isUsed}, 0) = 0 AND (${cards.expiresAt} IS NULL OR ${cards.expiresAt} > ${Date.now()}) AND (${cards.reservedAt} IS NULL OR ${cards.reservedAt} < ${Date.now() - 60000})`)
            .orderBy(desc(cards.createdAt))
    } catch (error: any) {
        const errorString = JSON.stringify(error)
        const isTableOrColumnMissing =
            error?.message?.includes('does not exist') ||
            error?.cause?.message?.includes('does not exist') ||
            errorString.includes('42P01') || // undefined_table
            errorString.includes('42703') || // undefined_column
            (errorString.includes('relation') && errorString.includes('does not exist'))

        if (!isTableOrColumnMissing) throw error

        await db.run(sql`
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                card_key TEXT NOT NULL,
                is_used INTEGER DEFAULT 0,
                reserved_order_id TEXT,
                reserved_at INTEGER,
                expires_at INTEGER,
                used_at INTEGER,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            CREATE UNIQUE INDEX IF NOT EXISTS cards_product_id_card_key_uq ON cards(product_id, card_key);
        `)

        unusedCards = await db.select()
            .from(cards)
            .where(sql`${cards.productId} = ${id} AND COALESCE(${cards.isUsed}, 0) = 0 AND (${cards.expiresAt} IS NULL OR ${cards.expiresAt} > ${Date.now()}) AND (${cards.reservedAt} IS NULL OR ${cards.reservedAt} < ${Date.now() - 60000})`)
            .orderBy(desc(cards.createdAt))
    }

    return (
        <CardsContent
            productId={id}
            productName={product.name}
            unusedCards={unusedCards.map((c: any) => ({ id: c.id, cardKey: c.cardKey }))}
        />
    )
}
