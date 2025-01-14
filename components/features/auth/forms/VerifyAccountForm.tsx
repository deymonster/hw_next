'use client';

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthWrapper } from "../AuthWrapper";
import { Loader } from "lucide-react";

interface VerifyAccountFormProps {
    token: string;
}

export function VerifyAccountForm({ token }: VerifyAccountFormProps) {
    const t = useTranslations('auth.verify');
    const router = useRouter();
    const [isVerifying, setIsVerifying] = useState(true);
    const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error'>('pending');

    useEffect(() => {
        async function verifyEmail() {
            try {
                const res = await fetch(`/api/account/verify-email?token=${token}`);
                const result = await res.json();

                if (result.success) {
                    setVerificationStatus('success');
                    toast.success(t('successMessage'));
                    setTimeout(() => {
                        router.push('/account/login');
                    }, 2000);
                } else {
                    setVerificationStatus('error');
                    toast.error(result.message || t('errorMesage'));
                }
            } catch (error) {
                setVerificationStatus('error');
                toast.error(t('error'));
            } finally {
                setIsVerifying(false);
            }
        }

        verifyEmail();
    }, [token, router, t]);

    return (
        <AuthWrapper heading={t('heading')}>
            <div className="flex justify-center">
                <Loader className="size-8 animate-spin" />
            </div>
        </AuthWrapper>
    );
}