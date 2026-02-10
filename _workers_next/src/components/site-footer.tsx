import { getSetting } from "@/lib/db/queries"
import { FooterContent } from "./footer-content"
import { APP_VERSION } from "@/lib/version"

export async function SiteFooter() {
    let shopFooter: string | null = null
    try {
        shopFooter = await getSetting('shop_footer')
    } catch {
        shopFooter = null
    }

    return <FooterContent customFooter={shopFooter} version={APP_VERSION} />
}
