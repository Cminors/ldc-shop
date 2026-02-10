import { PaymentLinkContent } from "@/components/payment-link-content"
import { md5 } from "@/lib/crypto"
import { unstable_noStore } from "next/cache"

function firstParam(value: string | string[] | undefined): string | undefined {
    if (!value) return undefined
    return Array.isArray(value) ? value[0] : value
}

export default async function PaymentLinkPage(props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
    unstable_noStore()
    const searchParams = await props.searchParams
    const payeeParam = (firstParam(searchParams.to) || '').trim()
    const sigParam = (firstParam(searchParams.sig) || '').trim()
    const adminUsers = (process.env.ADMIN_USERS || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    const fallbackPayee = adminUsers[0] || null
    const matchedAdmin = payeeParam
        ? adminUsers.find((name) => name.toLowerCase() === payeeParam.toLowerCase())
        : undefined
    const secret = process.env.MERCHANT_KEY || ''
    const expectedSig = payeeParam && secret ? md5(`payee=${payeeParam}${secret}`) : null
    const hasValidSig = !!(payeeParam && sigParam && expectedSig && sigParam === expectedSig)
    const payee = hasValidSig ? (matchedAdmin || fallbackPayee) : fallbackPayee

    return <PaymentLinkContent payee={payee} />
}
