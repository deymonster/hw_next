'use client'

import { useLocale, useTranslations } from "next-intl"
import { type FormEvent, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue
} from "@/components/ui/select"
import { useAuth } from "@/hooks/useAuth"
import { useWarranty } from "@/hooks/useWarranty"
import { WARRANTY_PERIODS } from "@/services/device/device.interfaces"

interface WarrantyEditorProps {
        deviceId: string
        initialPurchaseDate?: string | null
        initialWarrantyPeriod?: number | null
        onUpdate?: () => void
}

export function WarrantyEditor({
        deviceId,
        initialPurchaseDate,
        initialWarrantyPeriod,
        onUpdate
}: WarrantyEditorProps) {
        const { user } = useAuth()
        const { updateWarranty, isLoading } = useWarranty({
                onSuccess: () => {
                        onUpdate?.()
                }
        })
        const t = useTranslations("dashboard.devices.detail.system.warranty")
        const locale = useLocale()

        const [purchaseDate, setPurchaseDate] = useState<Date | undefined>(
                initialPurchaseDate ? new Date(initialPurchaseDate) : undefined
        )
        const [warrantyPeriod, setWarrantyPeriod] = useState<number | undefined>(
                initialWarrantyPeriod ?? undefined
        )

        const endDate = useMemo(() => {
                if (!purchaseDate || !warrantyPeriod) {
                        return null
                }

                const calculatedEnd = new Date(purchaseDate)
                calculatedEnd.setMonth(calculatedEnd.getMonth() + warrantyPeriod)
                return calculatedEnd
        }, [purchaseDate, warrantyPeriod])

        const formattedEndDate = useMemo(() => {
                if (!endDate) return null

                return new Intl.DateTimeFormat(locale, {
                        year: "numeric",
                        month: "long",
                        day: "2-digit"
                }).format(endDate)
        }, [endDate, locale])

        const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault()
                if (!user?.id) return

                await updateWarranty(
                        deviceId,
                        purchaseDate ?? null,
                        warrantyPeriod ?? null,
                        user.id
                )
        }

        return (
                <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                                <Label htmlFor="purchase-date">{t("purchaseDateLabel")}</Label>
                                <Input
                                        id="purchase-date"
                                        type="date"
                                        value={
                                                purchaseDate
                                                        ? purchaseDate.toISOString().split("T")[0]
                                                        : ""
                                        }
                                        onChange={event =>
                                                setPurchaseDate(
                                                        event.target.value
                                                                ? new Date(event.target.value)
                                                                : undefined
                                                )
                                        }
                                        disabled={isLoading}
                                />
                        </div>

                        <div className="space-y-2">
                                <Label htmlFor="warranty-period">
                                        {t("warrantyPeriodLabel")}
                                </Label>
                                <Select
                                        value={
                                                typeof warrantyPeriod === "number"
                                                        ? warrantyPeriod.toString()
                                                        : undefined
                                        }
                                        onValueChange={value => {
                                                if (value === "none") {
                                                        setWarrantyPeriod(undefined)
                                                        return
                                                }

                                                setWarrantyPeriod(Number(value))
                                        }}
                                        disabled={isLoading}
                                >
                                        <SelectTrigger id="warranty-period" className="w-full">
                                                <SelectValue placeholder={t("periodPlaceholder")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                                <SelectItem value="none">
                                                        {t("periodPlaceholder")}
                                                </SelectItem>
                                                {WARRANTY_PERIODS.map(option => (
                                                        <SelectItem
                                                                key={option.value}
                                                                value={option.value.toString()}
                                                        >
                                                                {t("periodOption", {
                                                                        months: option.value
                                                                })}
                                                        </SelectItem>
                                                ))}
                                        </SelectContent>
                                </Select>
                        </div>

                        {formattedEndDate && (
                                <div className="rounded-md bg-muted p-3">
                                        <p className="text-sm text-muted-foreground">
                                                <span className="font-medium">
                                                        {t("endDate", { date: formattedEndDate })}
                                                </span>
                                        </p>
                                </div>
                        )}

                        <Button type="submit" disabled={isLoading} size="default">
                                {isLoading ? t("saving") : t("saveButton")}
                        </Button>
                </form>
        )
}
