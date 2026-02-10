import { db } from "@/lib/db";
import { orders, cards, products, loginUsers as users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { isPaymentOrder } from "@/lib/payment";
import { notifyAdminPaymentSuccess } from "@/lib/notifications";
import { sendOrderEmail } from "@/lib/email";
import { recalcProductAggregates, createUserNotification } from "@/lib/db/queries";
import { RESERVATION_TTL_MS } from "@/lib/constants";
import { updateTag } from "next/cache";
import { after } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(value: string | null | undefined) {
    if (!value) return false
    return EMAIL_REGEX.test(value.trim())
}

export async function processOrderFulfillment(orderId: string, paidAmount: number, tradeNo: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.orderId, orderId)
    });

    if (!order) {
        throw new Error(`Order ${orderId} not found`);
    }

    // Verify Amount (Prevent penny-dropping)
    const orderMoney = parseFloat(order.amount);

    // Allow small float epsilon difference
    if (Math.abs(paidAmount - orderMoney) > 0.01) {
        throw new Error(`Amount mismatch! Order: ${orderMoney}, Paid: ${paidAmount}`);
    }

    const refreshAggregates = async () => {
        try {
            await recalcProductAggregates(order.productId);
        } catch {
            // best effort
        }
        try {
            updateTag('home:products');
            updateTag('home:product-categories');
        } catch {
            // best effort
        }
    };

    const notifyUserDelivered = async (productName: string | null | undefined) => {
        if (!order.userId) return
        await createUserNotification({
            userId: order.userId,
            type: 'order_delivered',
            titleKey: 'profile.notifications.orderDeliveredTitle',
            contentKey: 'profile.notifications.orderDeliveredBody',
            data: {
                params: {
                    orderId,
                    productName: productName || order.productName || 'Product'
                },
                href: `/order/${orderId}`
            }
        })
    }

    if (isPaymentOrder(order.productId)) {
        if (order.status === 'pending' || order.status === 'cancelled') {
            await db.update(orders)
                .set({
                    status: 'paid',
                    paidAt: new Date(),
                    tradeNo: tradeNo
                })
                .where(eq(orders.orderId, orderId));

            // Notify Admin
            after(async () => {
                try {
                    const user = await db.query.loginUsers.findFirst({
                        where: eq(users.userId, order.userId || ''),
                        columns: { username: true }
                    }).catch(() => null);

                    await notifyAdminPaymentSuccess({
                        orderId: orderId,
                        productName: "Payment (QR/Link)",
                        amount: order.amount,
                        username: user?.username,
                        email: order.email,
                        tradeNo: tradeNo
                    });
                } catch (err) {
                    console.error('[Notification] Payment order notify failed:', err);
                }
            })
        }
        await refreshAggregates();
        return { success: true, status: 'processed' };
    }

    if (order.status === 'pending' || order.status === 'cancelled') {
        // Check if product is shared (infinite stock)
        const product = await db.query.products.findFirst({
            where: eq(products.id, order.productId),
            columns: {
                isShared: true,
                name: true
            }
        });

        const isShared = product?.isShared;

        if (isShared) {
            // For shared products:
            const availableCard = await db.select({ id: cards.id, cardKey: cards.cardKey })
                .from(cards)
                .where(sql`${cards.productId} = ${order.productId} AND COALESCE(${cards.isUsed}, 0) = 0`)
                .orderBy(sql`RANDOM()`)
                .limit(1);

            if (availableCard.length > 0) {
                const key = availableCard[0].cardKey;
                const cardKeys = Array(order.quantity || 1).fill(key);
                const cardIdsValue = String(availableCard[0].id);

                await db.update(orders)
                    .set({
                        status: 'delivered',
                        paidAt: new Date(),
                        deliveredAt: new Date(),
                        tradeNo: tradeNo,
                        cardKey: cardKeys.join('\n'),
                        cardIds: cardIdsValue,
                        currentPaymentId: null
                    })
                    .where(eq(orders.orderId, orderId));

                console.log(`[Fulfill] Shared product order ${orderId} delivered. Card: ${key}`);

                try {
                    await notifyUserDelivered(product?.name);
                } catch (err) {
                    console.error('[Notification] User delivery notify failed:', err);
                }

                after(async () => {
                    try {
                        const user = await db.query.loginUsers.findFirst({
                            where: eq(users.userId, order.userId || ''),
                            columns: { username: true }
                        }).catch(() => null);

                        await notifyAdminPaymentSuccess({
                            orderId: orderId,
                            productName: product?.name || 'Shared Product',
                            amount: order.amount,
                            username: user?.username,
                            email: order.email,
                            tradeNo: tradeNo
                        });
                    } catch (err) {
                        console.error('[Notification] Shared product notify failed:', err);
                    }

                    const recipientEmail = order.email?.trim()
                    if (recipientEmail && isValidEmail(recipientEmail)) {
                        await sendOrderEmail({
                            to: recipientEmail,
                            orderId: orderId,
                            productName: product?.name || 'Product',
                            cardKeys: cardKeys.join('\n')
                        }).catch(err => console.error('[Email] Send failed:', err));
                    }
                })

                await refreshAggregates();
                return { success: true, status: 'processed' };
            } else {
                // No stock for shared product
                await db.update(orders)
                    .set({ status: 'paid', paidAt: new Date(), tradeNo: tradeNo })
                    .where(eq(orders.orderId, orderId));
                console.log(`[Fulfill] Order ${orderId} marked as paid (no stock for shared product)`);

                after(async () => {
                    try {
                        const user = await db.query.loginUsers.findFirst({
                            where: eq(users.userId, order.userId || ''),
                            columns: { username: true }
                        }).catch(() => null);

                        await notifyAdminPaymentSuccess({
                            orderId: orderId,
                            productName: product?.name || 'Shared Product',
                            amount: order.amount,
                            username: user?.username,
                            email: order.email,
                            tradeNo: tradeNo
                        });
                    } catch (err) {
                        console.error('[Notification] Shared product notify failed:', err);
                    }
                })

                await refreshAggregates();
                return { success: true, status: 'processed' };
            }
        }

        const quantity = order.quantity || 1;
        let cardKeys: string[] = [];
        const usedCardIds: number[] = [];
        const fiveMinutesAgo = Date.now() - RESERVATION_TTL_MS;

        // 1. Reserved cards
        try {
            const reservedCards = await db.select({ id: cards.id, cardKey: cards.cardKey })
                .from(cards)
                .where(sql`${cards.reservedOrderId} = ${orderId} AND COALESCE(${cards.isUsed}, 0) = 0`)
                .limit(quantity);

            for (const card of reservedCards) {
                await db.update(cards)
                    .set({
                        isUsed: true,
                        usedAt: new Date(),
                        reservedOrderId: null,
                        reservedAt: null
                    })
                    .where(eq(cards.id, card.id));
                cardKeys.push(card.cardKey);
                usedCardIds.push(card.id);
            }
        } catch (error: any) {
            console.log('[Fulfill] Reserved cards check failed:', error.message);
        }

        // 2. Available cards
        if (cardKeys.length < quantity) {
            const needed = quantity - cardKeys.length;
            const availableCards = await db.select({ id: cards.id, cardKey: cards.cardKey })
                .from(cards)
                .where(sql`${cards.productId} = ${order.productId} AND COALESCE(${cards.isUsed}, 0) = 0 AND (${cards.reservedAt} IS NULL OR ${cards.reservedAt} < ${fiveMinutesAgo})`)
                .limit(needed);

            for (const card of availableCards) {
                await db.update(cards)
                    .set({
                        isUsed: true,
                        usedAt: new Date()
                    })
                    .where(eq(cards.id, card.id));
                cardKeys.push(card.cardKey);
                usedCardIds.push(card.id);
            }
        }

        if (cardKeys.length > 0) {
            const joinedKeys = cardKeys.join('\n');
            const uniqueCardIds = Array.from(new Set(usedCardIds));
            const cardIdsValue = uniqueCardIds.length > 0 ? uniqueCardIds.join(',') : null;

            await db.update(orders)
                .set({
                    status: 'delivered',
                    paidAt: new Date(),
                    deliveredAt: new Date(),
                    tradeNo: tradeNo,
                    cardKey: joinedKeys,
                    cardIds: cardIdsValue
                })
                .where(eq(orders.orderId, orderId));
            console.log(`[Fulfill] Order ${orderId} delivered successfully!`);

            try {
                await notifyUserDelivered(product?.name || order.productName);
            } catch (err) {
                console.error('[Notification] User delivery notify failed:', err);
            }

            after(async () => {
                const product = await db.query.products.findFirst({
                    where: eq(products.id, order.productId),
                    columns: { name: true }
                });

                try {
                    const user = await db.query.loginUsers.findFirst({
                        where: eq(users.userId, order.userId || ''),
                        columns: { username: true }
                    }).catch(() => null);

                    await notifyAdminPaymentSuccess({
                        orderId: orderId,
                        productName: product?.name || 'Unknown Product',
                        amount: order.amount,
                        username: user?.username,
                        email: order.email,
                        tradeNo: tradeNo
                    });
                } catch (err) {
                    console.error('[Notification] Delivery notify failed:', err);
                }

                const recipientEmail = order.email?.trim()
                if (recipientEmail && isValidEmail(recipientEmail)) {
                    await sendOrderEmail({
                        to: recipientEmail,
                        orderId: orderId,
                        productName: product?.name || 'Product',
                        cardKeys: joinedKeys
                    }).catch(err => console.error('[Email] Send failed:', err));
                }
            })
        } else {
            // Paid but no stock
            await db.update(orders)
                .set({ status: 'paid', paidAt: new Date(), tradeNo: tradeNo })
                .where(eq(orders.orderId, orderId));
            console.log(`[Fulfill] Order ${orderId} marked as paid (no stock)`);

            after(async () => {
                try {
                    const user = await db.query.loginUsers.findFirst({
                        where: eq(users.userId, order.userId || ''),
                        columns: { username: true }
                    }).catch(() => null);

                    const product = await db.query.products.findFirst({
                        where: eq(products.id, order.productId),
                        columns: { name: true }
                    });

                    await notifyAdminPaymentSuccess({
                        orderId: orderId,
                        productName: product?.name || 'Unknown Product',
                        amount: order.amount,
                        username: user?.username,
                        email: order.email,
                        tradeNo: tradeNo
                    });
                } catch (err) {
                    console.error('[Notification] No-stock notify failed:', err);
                }
            })
        }
        await refreshAggregates();
        return { success: true, status: 'processed' };
    } else {
        return { success: true, status: 'already_processed' };
    }
}
