'use client'

import { resetPasswordSchema, type TypeResetPasswordSchema } from "@/schemas/auth/reset-password.shema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { resetPassword } from "@/app/actions/auth"
import { AuthWrapper } from "../AuthWrapper"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CircleCheck } from "lucide-react"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AUTH_ERRORS } from "@/libs/auth/constants"


export function ResetPasswordForm() {

    const t = useTranslations('auth.resetPassword')
    const [isSuccess, setIsSuccess] = useState(false)
    const [isPending, setIsPending] = useState(false)
    
    const form = useForm<TypeResetPasswordSchema>({
      resolver: zodResolver(resetPasswordSchema),
      defaultValues: {
        email: ""
      }
    })
  
    const { isValid } = form.formState
  
    async function onSubmit(data: TypeResetPasswordSchema) {
      try {
        setIsPending(true)
        const result = await resetPassword(data)
        
        if (result.error) {
          if (result.error === AUTH_ERRORS.USER_NOT_FOUND) {
            toast.error(t('userNotFound'))
          } else {
            toast.error(t('errorMessage'))
          }
          form.setError("root", {
            message: result.error
          })
          return
        }
  
        // Успешная отправка восстановления пароля
        setIsSuccess(true)
        
        
      } catch (error) {
        console.error(error)
        toast.error("Что-то пошло не так при восстановлении")
        
      } finally {
        setIsPending(false)
      }
    }

  return (
    <AuthWrapper 
      heading={t('heading')}
      backButtonLabel={t('backButtonLabel')}
      backButtonHref="/account/login"
    >
    {isSuccess ? (
      <Alert>
        <CircleCheck className="size-4" />
          <AlertTitle>{t('successAlertTitle')}</AlertTitle> 
        <AlertDescription>{t('successAlertDescription')}</AlertDescription>
      </Alert>
      ) : (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-y-3">
          <FormField 
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem>
                <FormLabel>{t('emailLabel')}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="username@example.com" 
                    disabled={isPending}
                    {...field}/> 
                </FormControl>
                <FormDescription>
                  {t('emailDescription')}
                </FormDescription>
              </FormItem>
            )}
          />

          <Button 
            className="mt-2 w-full" 
            disabled={!isValid || isPending}
            type="submit"
          >
            {t('submitButton')}
          </Button>
        </form>
      </Form>
    )}
    </AuthWrapper>
  )

}
