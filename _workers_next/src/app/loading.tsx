export default function Loading() {
  return (
    <div className="container py-8 md:py-16 space-y-6">
      <div className="h-8 w-40 rounded-md bg-muted/60 animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-muted/40 animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
