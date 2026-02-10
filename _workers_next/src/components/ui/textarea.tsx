import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "peer border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:shadow-[0_0_0_1px_hsl(var(--ring)),0_0_12px_-4px_hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_hsl(var(--destructive)),0_0_12px_-4px_hsl(var(--destructive))] aria-invalid:animate-input-shake",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
