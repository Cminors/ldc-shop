import { getUsers } from "@/lib/db/queries"
import { UsersContent } from "@/components/admin/users-content"
import { checkAdmin } from "@/actions/admin"
import { Suspense } from "react"

async function UsersContentLoader(props: { searchParams: Promise<{ page?: string; q?: string }> }) {
    await checkAdmin()

    const searchParams = await props.searchParams
    const page = Number(searchParams.page) || 1
    const q = searchParams.q || ''
    const pageSize = 20

    const data = await getUsers(page, pageSize, q)

    return <UsersContent data={data} />
}

function UsersFallback() {
    return (
        <div className="space-y-4">
            <div className="h-8 w-40 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-16 w-full rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-16 w-full rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-16 w-full rounded-xl bg-muted/40 animate-pulse" />
        </div>
    )
}

export default function UsersPage(props: { searchParams: Promise<{ page?: string; q?: string }> }) {
    return (
        <Suspense fallback={<UsersFallback />}>
            <UsersContentLoader searchParams={props.searchParams} />
        </Suspense>
    )
}
