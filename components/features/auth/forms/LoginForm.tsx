'use client'

import { authenticate } from "@/app/actions/auth"
import { loginSchema, type TypeLoginSchema } from "@/schemas/auth/login.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { AuthWrapper } from "../AuthWrapper"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"


export function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const t = useTranslations('auth.login')
    const errors = useTranslations('auth.errors')
    const [isLoadingLogin, setIsLoadingLogin] = useState(false)
    
    const form = useForm<TypeLoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: ''
        }
    })

    const { isValid } = form.formState

    const onSubmit = async (data: TypeLoginSchema) => {
        try {
            setIsLoadingLogin(true)
            const formData = new FormData()
            formData.append('email', data.email)
            formData.append('password', data.password)

            
            // Получаем маршрут откуда пришел пользователь
            // Преобразуем null в undefined для типизации
            const from = searchParams.get('from') || undefined
            const result = await authenticate(from, formData)

            if (result.error) {
                toast.error(errors(result.error));
                return;
            }
            
            if (result.success && result.callbackUrl) {
                toast.success(t('successMessage'))
                router.push(result.callbackUrl)
            } else {
                toast.error(t('errorMessage'))
            }
        } catch (error) {
            toast.error(t('errorMessage'))
            console.error('Login error:', error)
        } finally {
            setIsLoadingLogin(false)
        }
    }

    return (
        <AuthWrapper
            heading={t('heading')}
            backButtonLabel={t('backButtonLabel')}
            backButtonHref='/account/create'
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-y-3">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('loginLabel')}</FormLabel>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type="email" 
                                        placeholder="email@example.com"
                                        disabled={isLoadingLogin}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t('loginDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between">
                                    <FormLabel>{t('passwordLabel')}</FormLabel>
                                    <Link href='recovery' className="ml-auto inline-block text-sm">
                                        {t('forgotPassword')}
                                    </Link>
                                </div>
                                <FormControl>
                                    <Input 
                                        {...field} 
                                        type="password"
                                        disabled={isLoadingLogin}
                                    />
                                </FormControl>
                                <FormDescription>
                                    {t('passwordDescription')}
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button 
                        className="mt-2 w-full" 
                        disabled={!isValid || isLoadingLogin}
                        type="submit"
                    >
                        {t('submitButton')}
                    </Button>
                </form>
            </Form>
        </AuthWrapper>
    )
}