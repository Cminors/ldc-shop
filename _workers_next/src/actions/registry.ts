"use server"

import { checkAdmin } from "@/actions/admin"
import { getSetting, setSetting } from "@/lib/db/queries"
import { ensureRegistryInstanceId, getRegistryBaseUrl, normalizeOrigin } from "@/lib/registry"
import { revalidatePath } from "next/cache"

interface RegistryResult {
    ok: boolean
    error?: string
}

export async function dismissRegistryPrompt(): Promise<RegistryResult> {
    await checkAdmin()
    await setSetting("registry_prompted", "true")
    await setSetting("registry_opt_in", "false")
    return { ok: true }
}

export async function joinRegistry(origin: string): Promise<RegistryResult> {
    await checkAdmin()
    const baseUrl = getRegistryBaseUrl()
    if (!baseUrl) {
        return { ok: false, error: "registry_not_configured" }
    }

    let normalized: string
    try {
        normalized = normalizeOrigin(origin)
    } catch (error: any) {
        return { ok: false, error: error?.message || "invalid_origin" }
    }

    await ensureRegistryInstanceId()

    const challengeRes = await fetch(`${baseUrl}/challenge`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized }),
    })

    if (!challengeRes.ok) {
        return { ok: false, error: `challenge_failed_${challengeRes.status}` }
    }

    const challengeData = await challengeRes.json()
    const token = (challengeData?.token || "").toString()
    if (!token) {
        return { ok: false, error: "challenge_token_missing" }
    }

    await setSetting("registry_challenge_token", token)
    await setSetting("registry_origin", normalized)

    const submitRes = await fetch(`${baseUrl}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized }),
    })

    if (!submitRes.ok) {
        const errorText = await submitRes.text()
        return { ok: false, error: `submit_failed_${submitRes.status}:${errorText}` }
    }

    await setSetting("registry_opt_in", "true")
    await setSetting("registry_hide_nav", "false")
    await setSetting("registry_prompted", "true")
    await setSetting("registry_last_submit_at", String(Date.now()))

    revalidatePath("/nav")
    revalidatePath("/navi")

    return { ok: true }
}

export async function getRegistryStatus() {
    await checkAdmin()
    const [optIn, origin, lastSubmit] = await Promise.all([
        getSetting("registry_opt_in"),
        getSetting("registry_origin"),
        getSetting("registry_last_submit_at"),
    ])
    return {
        optIn: optIn === "true",
        origin: origin || null,
        lastSubmitAt: lastSubmit ? Number(lastSubmit) : null,
    }
}
