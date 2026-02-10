'use client'

import { useRef, useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Package, Clock, AlertCircle, CheckCircle2, Loader2, User } from "lucide-react"
import { CopyButton } from "@/components/copy-button"
import { ClientDate } from "@/components/client-date"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { requestRefund } from "@/actions/refund-requests"
import { toast } from "sonner"
import { useEffect } from "react"
import { checkOrderStatus, cancelPendingOrder } from "@/actions/order"
import { useRouter } from "next/navigation"
import { isPaymentOrder } from "@/lib/payment"

interface Order {
    orderId: string
    productId?: string | null
    productName: string
    amount: string
    status: string
    cardKey: string | null
    payee?: string | null
    createdAt: Date | null
    paidAt: Date | null
}

interface OrderContentProps {
    order: Order
    canViewKey: boolean
    isOwner: boolean
    refundRequest: { status: string | null; reason: string | null } | null
}

export function OrderContent({ order, canViewKey, isOwner, refundRequest }: OrderContentProps) {
    const { t } = useI18n()
    const [reason, setReason] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const submitLock = useRef(false)
    const isPayment = isPaymentOrder(order.productId)

    const handleRefundConfirm = async () => {
        if (submitLock.current) return
        submitLock.current = true
        setSubmitting(true)
        try {
            await requestRefund(order.orderId, reason)
            toast.success(t('refund.requested'))
            setConfirmOpen(false)
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSubmitting(false)
            submitLock.current = false
        }
    }

    const getStatusBadgeVariant = (status: string) => {
        switch (status) {
            case 'delivered': return 'default'
            case 'paid': return 'secondary'
            case 'refunded': return 'destructive'
            case 'cancelled': return 'secondary'
            default: return 'outline'
        }
    }

    const getStatusText = (status: string) => {
        return t(`order.status.${status}`) || status.toUpperCase()
    }

    const getStatusMessage = (status: string) => {
        switch (status) {
            case 'paid': return isPayment ? t('payment.paidMessage') : t('order.stockDepleted')
            case 'cancelled': return t('order.cancelledMessage')
            case 'refunded': return t('order.orderRefunded')
            default: return t('order.waitingPayment')
        }
    }

    // Auto-check status if pending
    const router = useRouter()

    // Check status on mount and polling
    useEffect(() => {
        if (order.status !== 'pending') return

        let mounted = true
        let intervalId: NodeJS.Timeout

        const check = async () => {
            try {
                const result = await checkOrderStatus(order.orderId)
                if (result.success && (result.status === 'paid' || result.status === 'delivered') && mounted) {
                    toast.success(t('order.paymentSuccess'))
                    router.refresh()
                }
            } catch (e) {
                console.error("Auto check failed", e)
            }
        }

        // Check immediately
        check()

        // Poll every 3s for 1 minute (20 times)
        let attempts = 0
        intervalId = setInterval(() => {
            if (attempts > 20) {
                clearInterval(intervalId)
                return
            }
            attempts++
            check()
        }, 3000)

        return () => {
            mounted = false
            clearInterval(intervalId)
        }
    }, [order.status, order.orderId, router, t])

    return (
        <main className="container py-12 max-w-2xl">
            <Card className="tech-card overflow-hidden">
                <CardHeader className="relative">
                    {/* Status glow effect */}
                    {order.status === 'delivered' && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
                    )}

                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">{t('order.title')}</CardTitle>
                            <CardDescription className="font-mono text-xs bg-muted/50 px-2 py-1 rounded inline-block">
                                {order.orderId}
                            </CardDescription>
                        </div>
                        <Badge
                            variant={getStatusBadgeVariant(order.status)}
                            className={`uppercase text-xs tracking-wider ${order.status === 'delivered' ? 'bg-green-500/10 text-green-500 border-green-500/30' : ''}`}
                        >
                            {getStatusText(order.status)}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Info Cards */}
                    <div className="grid gap-4">
                        {/* Product Info */}
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/30">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    {isPayment ? t('payment.itemLabel') : t('order.product')}
                                </p>
                                <p className="font-semibold">{isPayment ? t('payment.title') : order.productName}</p>
                            </div>
                            <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                                {isPayment ? (
                                    <CreditCard className="h-5 w-5 text-primary" />
                                ) : (
                                    <Package className="h-5 w-5 text-primary" />
                                )}
                            </div>
                        </div>

                        {isPayment && order.payee && (
                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/30">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {t('payment.payeeLabel')}
                                    </p>
                                    <p className="font-semibold">{order.payee}</p>
                                </div>
                                <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                                    <User className="h-5 w-5 text-primary" />
                                </div>
                            </div>
                        )}

                        {/* Amount Info */}
                        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-muted/40 to-muted/20 rounded-xl border border-border/30">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('order.amountPaid')}</p>
                                <p className="font-semibold text-xl">
                                    <span className="gradient-text">{Number(order.amount)}</span>
                                    <span className="text-xs font-normal text-muted-foreground ml-1.5">{t('common.credits')}</span>
                                </p>
                            </div>
                            <div className="h-12 w-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                                <CreditCard className="h-5 w-5 text-primary" />
                            </div>
                        </div>

                        {/* Time Info */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">{t('order.createdAt')}</p>
                                <p className="text-sm font-medium">
                                    <ClientDate value={order.createdAt} format="dateTime" placeholder="-" />
                                </p>
                            </div>
                            <div className="p-4 bg-muted/20 rounded-xl border border-border/20">
                                <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">{t('order.paidAt')}</p>
                                <p className="text-sm font-medium">
                                    <ClientDate value={order.paidAt} format="dateTime" placeholder="-" />
                                </p>
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-border/50" />

                    {/* Content Display */}
                    {order.status === 'delivered' && !isPayment ? (
                        canViewKey ? (
                            <div className="space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    {t('order.yourContent')}
                                </h3>
                                {/* Terminal-style display */}
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-accent/50 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-300" />
                                    <div className="relative p-4 bg-slate-950 rounded-xl font-mono text-sm text-slate-100 break-all whitespace-pre-wrap pr-14 border border-slate-800">
                                        <div className="absolute top-2 left-4 flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                        </div>
                                        <div className="mt-4">
                                            {order.cardKey}
                                        </div>
                                        <div className="absolute top-3 right-3">
                                            <CopyButton text={order.cardKey || ''} iconOnly />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {t('order.saveKeySecurely')}
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-xl flex gap-3 text-sm border border-yellow-500/20">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p>{t('order.loginToView')}</p>
                            </div>
                        )
                    ) : (
                        <div className={`flex items-center justify-between gap-3 p-4 rounded-xl border ${order.status === 'paid'
                            ? (isPayment
                                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20')
                            : 'bg-muted/20 text-muted-foreground border-border/30'
                            }`}>
                            <div className="flex items-center gap-3">
                                {order.status === 'paid' ? (
                                    isPayment ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />
                                ) : (
                                    <Clock className="h-5 w-5" />
                                )}
                                <p className="text-sm">{getStatusMessage(order.status)}</p>
                            </div>

                            {isOwner && order.status === 'pending' && (
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            if (!confirm(t('order.confirmCancel'))) return
                                            if (submitLock.current) return
                                            submitLock.current = true
                                            setSubmitting(true)
                                            try {
                                                const result = await cancelPendingOrder(order.orderId)
                                                if (result.success) {
                                                    toast.success(t('order.cancelled'))
                                                    router.refresh()
                                                } else {
                                                    toast.error(result.error ? t(result.error) : t('common.error'))
                                                }
                                            } catch (e: any) {
                                                toast.error(e.message)
                                            } finally {
                                                setSubmitting(false)
                                                submitLock.current = false
                                            }
                                        }}
                                        disabled={submitting}
                                    >
                                        {t('order.cancelOrder')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={async () => {
                                            if (submitLock.current) return
                                            submitLock.current = true
                                            setSubmitting(true)
                                            try {
                                                const { getRetryPaymentParams } = await import("@/actions/checkout")
                                                const result = await getRetryPaymentParams(order.orderId)
                                                if (result.success && result.params) {
                                                    const form = document.createElement('form')
                                                    form.method = 'POST'
                                                    form.action = '/paying'
                                                    Object.entries(result.params).forEach(([k, v]) => {
                                                        const input = document.createElement('input')
                                                        input.type = 'hidden'
                                                        input.name = k
                                                        input.value = String(v)
                                                        form.appendChild(input)
                                                    })
                                                    document.body.appendChild(form)
                                                    form.submit()
                                                } else {
                                                    toast.error(result.error ? t(result.error) : t('common.error'))
                                                }
                                            } catch (e: any) {
                                                toast.error(e.message)
                                            } finally {
                                                setSubmitting(false)
                                                submitLock.current = false
                                            }
                                        }}
                                        disabled={submitting}
                                    >
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('common.payNow')}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {isOwner && (order.status === 'paid' || order.status === 'delivered') && Number(order.amount) > 0 && (
                        <>
                            <Separator className="bg-border/50" />
                            <div className="space-y-3">
                                <h3 className="font-semibold">{t('refund.requestTitle')}</h3>
                                {refundRequest?.status ? (
                                    <div className="text-sm text-muted-foreground">
                                        {t('refund.requestStatus', { status: t(`refund.statusValues.${refundRequest.status}`) })}
                                    </div>
                                ) : (
                                    <div className="text-sm text-muted-foreground">
                                        {t('refund.requestHint')}
                                    </div>
                                )}
                                <Textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={t('refund.reasonPlaceholder')}
                                    rows={3}
                                    className="resize-none"
                                    disabled={submitting || !!refundRequest?.status}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={async () => {
                                            setConfirmOpen(true)
                                        }}
                                        disabled={submitting || !!refundRequest?.status}
                                    >
                                        {submitting ? t('common.processing') : t('refund.requestButton')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base">{t('refund.requestConfirmTitle')}</DialogTitle>
                                <DialogDescription className="text-sm">
                                    {t('refund.requestConfirmMessage')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-end">
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleRefundConfirm} disabled={submitting}>
                            {submitting ? t('common.processing') : t('common.confirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </main>
    )
}
