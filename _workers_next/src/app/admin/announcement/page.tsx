import { AnnouncementForm } from "@/components/admin/announcement-form"
import { getAnnouncementConfig } from "@/actions/settings"
import { Suspense } from "react"

async function AnnouncementContent() {
    const announcement = await getAnnouncementConfig()

    return (
        <div className="space-y-6">
            <AnnouncementForm initialConfig={announcement} />
        </div>
    )
}

function AnnouncementFallback() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-40 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-40 w-full rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-10 w-32 rounded-md bg-muted/40 animate-pulse" />
        </div>
    )
}

export default function AnnouncementPage() {
    return (
        <Suspense fallback={<AnnouncementFallback />}>
            <AnnouncementContent />
        </Suspense>
    )
}
