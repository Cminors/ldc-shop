'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from '@/components/star-rating'
import { submitReview } from '@/actions/reviews'

interface ReviewFormProps {
    productId: string
    orderId: string
    onSuccess?: () => void
}

export function ReviewForm({ productId, orderId, onSuccess }: ReviewFormProps) {
    const { t } = useI18n()
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async () => {
        if (rating < 1 || rating > 5) {
            setError(t('review.invalidRating'))
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const result = await submitReview(productId, orderId, rating, comment)
            if (result.success) {
                setSubmitted(true)
                onSuccess?.()
            } else {
                const message = result.error ? t(result.error) : t('review.submitError')
                setError(message)
            }
        } catch {
            setError(t('review.submitError'))
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) {
        return (
            <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-sm text-muted-foreground">{t('review.submitted')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('review.yourRating')}</label>
                <StarRating rating={rating} size="lg" interactive onChange={setRating} />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">{t('review.yourComment')}</label>
                <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('review.commentPlaceholder')}
                    rows={3}
                    className="resize-none"
                />
            </div>
            {error && (
                <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-primary/80"
            >
                {submitting ? t('common.processing') : t('review.submit')}
            </Button>
        </div>
    )
}
