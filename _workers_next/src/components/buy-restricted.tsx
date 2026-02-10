"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"

export function BuyRestricted({ requiredLevel, isLoggedIn }: { requiredLevel: number; isLoggedIn: boolean }) {
  const { t } = useI18n()
  return (
    <main className="container py-16 max-w-lg">
      <Card className="tech-card">
        <CardHeader>
          <CardTitle>{t("buy.visibilityTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {isLoggedIn
              ? t("buy.visibilityLevel", { level: requiredLevel })
              : t("buy.visibilityLogin")}
          </p>
          {!isLoggedIn && (
            <Link href="/login" className="inline-flex">
              <Button>{t("common.login")}</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
