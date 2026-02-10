import { db } from "@/lib/db"
import { adminMessages, userMessages } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { AdminMessagesContent } from "@/components/admin/messages-content"
import { unstable_noStore } from "next/cache"

function isMissingTable(error: any) {
  const errorString = JSON.stringify(error)
  return (
    error?.message?.includes('does not exist') ||
    error?.cause?.message?.includes('does not exist') ||
    errorString.includes('42P01') ||
    (errorString.includes('relation') && errorString.includes('does not exist'))
  )
}

export default async function AdminMessagesPage() {
  unstable_noStore()
  let rows: any[] = []
  let inbox: any[] = []
  try {
    rows = await db
      .select({
        id: adminMessages.id,
        targetType: adminMessages.targetType,
        targetValue: adminMessages.targetValue,
        title: adminMessages.title,
        body: adminMessages.body,
        sender: adminMessages.sender,
        createdAt: adminMessages.createdAt
      })
      .from(adminMessages)
      .orderBy(desc(adminMessages.createdAt))
      .limit(200)
  } catch (e: any) {
    if (!isMissingTable(e)) throw e
    rows = []
  }

  try {
    inbox = await db
      .select({
        id: userMessages.id,
        userId: userMessages.userId,
        username: userMessages.username,
        title: userMessages.title,
        body: userMessages.body,
        isRead: userMessages.isRead,
        createdAt: userMessages.createdAt
      })
      .from(userMessages)
      .orderBy(desc(userMessages.createdAt))
      .limit(200)
  } catch (e: any) {
    if (!isMissingTable(e)) throw e
    inbox = []
  }

  return <AdminMessagesContent history={rows} inbox={inbox} />
}
