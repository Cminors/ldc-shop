import { db } from "@/lib/db";
import { orders, cards } from "@/lib/db/schema";
import { md5 } from "@/lib/crypto";
import { eq, sql } from "drizzle-orm";
import { withOrderColumnFallback } from "@/lib/db/queries";

const LOG_NOTIFY_DETAILS = process.env.NODE_ENV !== 'production';

function summarizeNotifyParams(params: Record<string, any>) {
    return {
        out_trade_no: params.out_trade_no,
        trade_status: params.trade_status,
        money: params.money
    }
}

async function processNotify(params: Record<string, any>) {
    if (LOG_NOTIFY_DETAILS) {
        console.log("[Notify] Processing params:", JSON.stringify(params));
    } else {
        console.log("[Notify] Processing:", summarizeNotifyParams(params));
    }

    // Verify Sign
    const sign = params.sign;
    const sorted = Object.keys(params)
        .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== null && params[k] !== undefined)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');

    const mySign = md5(`${sorted}${process.env.MERCHANT_KEY}`);

    if (LOG_NOTIFY_DETAILS) {
        console.log("[Notify] Signature check - received:", sign, "computed:", mySign);
    } else {
        console.log("[Notify] Signature check");
    }

    if (sign !== mySign) {
        console.log("[Notify] Signature mismatch!");
        return new Response('fail', { status: 400 });
    }

    console.log("[Notify] Signature verified OK. trade_status:", params.trade_status);

    if (params.trade_status === 'TRADE_SUCCESS') {
        let orderId = params.out_trade_no;
        // Strip retry suffix if present (e.g. ORDER123_retry173654)
        if (orderId.includes('_retry')) {
            orderId = orderId.split('_retry')[0];
        }

        const tradeNo = params.trade_no;

        console.log("[Notify] Processing order:", orderId);

        // Find Order
        const order = await withOrderColumnFallback(async () => {
            return await db.query.orders.findFirst({
                where: eq(orders.orderId, orderId)
            });
        });

        console.log("[Notify] Order found:", order ? "YES" : "NO", "status:", order?.status);

        if (order) {
            // Verify Amount (Prevent penny-dropping)
            const notifyMoney = parseFloat(params.money);
            const orderMoney = parseFloat(order.amount);

            // Allow small float epsilon difference
            if (Math.abs(notifyMoney - orderMoney) > 0.01) {
                console.error(`[Notify] Amount mismatch! Order: ${orderMoney}, Notify: ${notifyMoney}`);
                return new Response('fail', { status: 400 });
            }

            if (order.status === 'pending' || order.status === 'cancelled') {
                try {
                    const { processOrderFulfillment } = await import("@/lib/order-processing");
                    await processOrderFulfillment(orderId, notifyMoney, tradeNo);
                } catch (e: any) {
                    console.error("[Notify] Fulfillment error:", e);
                    // Don't error the callback if it's already processed or internal error, 
                    // otherwise payment gateway retries. 
                    // Ideally we should differentiate idempotent errors vs hard errors.
                    // But for now, if fulfillment fails, maybe log it.
                    // If shared validation fails (amount mismatch), processOrderFulfillment throws.
                    if (e.message.includes('Amount mismatch')) {
                        return new Response('fail', { status: 400 });
                    }
                }
            }
        }
    }

    return new Response('success');
}

// Handle GET requests (Linux DO Credit sends GET)
export async function GET(request: Request) {
    console.log("[Notify] Received GET callback");

    try {
        const url = new URL(request.url);
        const params: Record<string, any> = {};
        url.searchParams.forEach((value, key) => {
            params[key] = value;
        });

        return await processNotify(params);
    } catch (e) {
        console.error("[Notify] Error:", e);
        return new Response('error', { status: 500 });
    }
}

// Also handle POST requests for compatibility
export async function POST(request: Request) {
    console.log("[Notify] Received POST callback");

    try {
        const formData = await request.formData();
        const params: Record<string, any> = {};
        formData.forEach((value, key) => {
            params[key] = value;
        });

        return await processNotify(params);
    } catch (e) {
        console.error("[Notify] Error:", e);
        return new Response('error', { status: 500 });
    }
}
