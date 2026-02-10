"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"
import { LogIn } from "lucide-react"

export default function LoginPage() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  return (
    <main className="container py-16 max-w-md">
      <Card className="tech-card overflow-hidden">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">{t("common.login")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            size="lg"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            onClick={() => signIn("linuxdo", { callbackUrl })}
          >
            <LogIn className="mr-2 h-4 w-4" />
            {t("common.login")}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
