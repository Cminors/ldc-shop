import { getSetting, setSetting } from "@/lib/db/queries"
import { APP_VERSION } from "@/lib/version"

export const REGISTRY_APP_ID = "ldc-shop"

const DEFAULT_REGISTRY_URL = "https://ldcnavi.chatgptuk.workers.dev"

export function getRegistryBaseUrl(): string {
    const raw = process.env.NEXT_PUBLIC_REGISTRY_URL || process.env.REGISTRY_URL || DEFAULT_REGISTRY_URL
    return raw.replace(/\/+$/, "")
}

export function isRegistryEnabled(): boolean {
    return !!getRegistryBaseUrl()
}

export function normalizeOrigin(input: string): string {
    const url = new URL(input)
    if (url.protocol !== "https:") {
        throw new Error("Only https URLs are allowed")
    }
    return url.origin
}

export async function ensureRegistryInstanceId(): Promise<string> {
    let instanceId = await getSetting("registry_instance_id")
    if (!instanceId) {
        const randomId = globalThis.crypto?.randomUUID?.()
        instanceId = randomId || `ldc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        await setSetting("registry_instance_id", instanceId)
    }
    return instanceId
}

export async function getRegistryMetadata(origin: string) {
    const [name, description, logo, instanceId, verifyToken] = await Promise.all([
        getSetting("shop_name"),
        getSetting("shop_description"),
        getSetting("shop_logo"),
        ensureRegistryInstanceId(),
        getSetting("registry_challenge_token"),
    ])

    return {
        app: REGISTRY_APP_ID,
        version: APP_VERSION,
        name: (name || "LDC Shop").trim(),
        description: (description || "").trim(),
        logo: (logo || "").trim(),
        url: origin,
        instanceId,
        verifyToken: (verifyToken || "").trim(),
        updatedAt: Date.now(),
    }
}

export interface RegistryShop {
    name: string
    url: string
    logo?: string | null
    description?: string | null
    updated_at?: number
}

export async function fetchRegistryShops() {
    const baseUrl = getRegistryBaseUrl()
    if (!baseUrl) {
        return { items: [] as RegistryShop[], error: "registry_not_configured" }
    }

    const res = await fetch(`${baseUrl}/shops?limit=300`, {
        next: { revalidate: 300 },
    })

    if (!res.ok) {
        return { items: [] as RegistryShop[], error: `registry_error_${res.status}` }
    }

    const data = await res.json()
    return { items: (data?.items || []) as RegistryShop[], error: null }
}
