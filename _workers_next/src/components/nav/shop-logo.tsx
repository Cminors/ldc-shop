'use client'

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

interface ShopLogoProps {
    name: string
    url: string
    logo?: string | null
}

function getOrigin(url: string) {
    try {
        return new URL(url).origin
    } catch {
        return ""
    }
}

export function ShopLogo({ name, url, logo }: ShopLogoProps) {
    const [error, setError] = useState(false)
    const [index, setIndex] = useState(0)
    const fallbackLetter = name?.trim()?.slice(0, 1) || "L"
    const candidates = useMemo(() => {
        const list: string[] = []
        const trimmedLogo = (logo || "").trim()
        if (trimmedLogo) list.push(trimmedLogo)
        const origin = getOrigin(url)
        if (origin) {
            list.push(`${origin}/icon.svg`)
            list.push(`${origin}/favicon`)
            list.push(`${origin}/favicon.ico`)
        }
        return Array.from(new Set(list))
    }, [logo, url])

    useEffect(() => {
        setError(false)
        setIndex(0)
    }, [candidates.join("|")])

    const src = candidates[index] || ""

    return (
        <div
            className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40 text-sm font-semibold text-muted-foreground",
                src && !error ? "bg-transparent" : ""
            )}
        >
            {src && !error ? (
                <img
                    src={src}
                    alt={name}
                    className="h-12 w-12 rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => {
                        if (index + 1 < candidates.length) {
                            setIndex(index + 1)
                        } else {
                            setError(true)
                        }
                    }}
                />
            ) : (
                fallbackLetter
            )}
        </div>
    )
}
