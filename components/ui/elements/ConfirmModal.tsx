'use client'

import { useTranslations } from "next-intl";
import type { PropsWithChildren } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../alertDialog";

interface ConfirmModalProps {
    heading: string
    message: string
    onConfirm: () => void
}

export function ConfirmModal({
    children,
    heading,
    message,
    onConfirm
}: PropsWithChildren<ConfirmModalProps>){
    const t = useTranslations('components.confirmModal')
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{heading}</AlertDialogTitle>
                <AlertDialogDescription>
                    {message}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>{t('continue')}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
    )
}