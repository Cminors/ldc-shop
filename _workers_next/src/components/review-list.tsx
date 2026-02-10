'use client'

import { useI18n } from '@/lib/i18n/context'
import { StarRating } from '@/components/star-rating'
import { Card, CardContent } from '@/components/ui/card'
import { ClientDate } from '@/components/client-date'

interface Review {
    id: number
    username: string
    rating: number
    comment: string | null
    createdAt: Date | string | null
}

interface ReviewListProps {
    reviews: Review[]
    averageRating: number
    totalCount: number
}

export function ReviewList({ reviews, averageRating, totalCount }: ReviewListProps) {
    const { t } = useI18n()

    if (totalCount === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>{t('review.noReviews')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                <div className="text-3xl font-bold gradient-text">
                    {averageRating.toFixed(1)}
                </div>
                <div className="space-y-1">
                    <StarRating rating={Math.round(averageRating)} size="md" />
                    <p className="text-sm text-muted-foreground">
                        {totalCount} {t('review.title').toLowerCase()}
                    </p>
                </div>
            </div>

            {/* Review List */}
            <div className="space-y-3">
                {reviews.map((review) => (
                    <Card key={review.id} className="bg-card/50">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm">{review.username}</span>
                                        <StarRating rating={review.rating} size="sm" />
                                    </div>
                                    {review.comment && (
                                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                                    )}
                                </div>
                                <ClientDate
                                    value={review.createdAt}
                                    className="text-xs text-muted-foreground shrink-0"
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
