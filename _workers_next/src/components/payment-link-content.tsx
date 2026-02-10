'use client'

import { useState } from "react"
import { useI18n } from "@/lib/i18n/context"
import { createPaymentOrder } from "@/actions/payment"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard } from "lucide-react"
import { toast } from "sonner"

export function PaymentLinkContent({ payee }: { payee?: string | null }) {
    const { t } = useI18n()
    const [amount, setAmount] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const numeric = Number.parseFloat(amount)
        if (!Number.isFinite(numeric) || numeric <= 0) {
            toast.error(t('payment.invalidAmount'))
            return
        }

        setSubmitting(true)
        try {
            const result = await createPaymentOrder(numeric, payee)
            if (!result?.success || !result.params) {
                toast.error(result?.error ? t(result.error) : t('common.error'))
                return
            }

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
        } catch (e: any) {
            toast.error(e.message || t('common.error'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <main className="container py-12 max-w-2xl">
            <Card className="tech-card overflow-hidden">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl">{t('payment.pageTitle')}</CardTitle>
                    <CardDescription>{t('payment.pageDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {payee && (
                            <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    {t('payment.payeeLabel')}
                                </div>
                                <div className="text-sm font-semibold">{payee}</div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="payment-amount">{t('payment.amountLabel')}</Label>
                            <div className="relative">
                                <Input
                                    id="payment-amount"
                                    type="number"
                                    inputMode="decimal"
                                    min="0.01"
                                    step="0.01"
                                    placeholder={t('payment.amountPlaceholder')}
                                    value={amount}
                                    onChange={(event) => setAmount(event.target.value)}
                                    disabled={submitting}
                                    className="pr-12"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    {t('common.credits')}
                                </span>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                            {t('payment.payButton')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                    {t('payment.notice')}
                </CardFooter>
            </Card>
        </main>
    )
}
