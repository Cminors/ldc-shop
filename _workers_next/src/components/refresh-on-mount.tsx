"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export function RefreshOnMount() {
  const router = useRouter()
  const did = useRef(false)

  useEffect(() => {
    if (did.current) return
    did.current = true
    router.refresh()
  }, [router])

  return null
}
