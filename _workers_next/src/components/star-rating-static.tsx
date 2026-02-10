import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingStaticProps {
  rating: number
  maxRating?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

export function StarRatingStatic({
  rating,
  maxRating = 5,
  size = 'md',
}: StarRatingStaticProps) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-muted text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  )
}
