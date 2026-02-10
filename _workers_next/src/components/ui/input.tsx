import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "peer file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow,transform] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:shadow-[0_0_0_1px_hsl(var(--ring)),0_0_12px_-4px_hsl(var(--ring))]",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_1px_hsl(var(--destructive)),0_0_12px_-4px_hsl(var(--destructive))] aria-invalid:animate-input-shake",
        className
      )}
      {...props}
    />
  )
}

export { Input }
