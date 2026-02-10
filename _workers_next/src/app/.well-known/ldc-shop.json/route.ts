import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { getRegistryMetadata } from "@/lib/registry"

async function getRequestOrigin() {
    const h = await headers()
    const host = h.get("x-forwarded-host") || h.get("host") || ""
    const proto = h.get("x-forwarded-proto") || "https"
    return host ? `${proto}://${host}` : ""
}

export async function GET() {
    const origin = await getRequestOrigin()
    const metadata = await getRegistryMetadata(origin)
    return NextResponse.json(metadata, {
        headers: {
            "Cache-Control": "no-store",
        },
    })
}
