'use client'
import { useForm } from "react-hook-form";
import { AuthWrapper } from "../AuthWrapper";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAccountSchema, TypeCreateAccountSchema } from "@/schemas/auth/create-account.schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUser } from "@/app/actions/auth";
import { useState } from "react";
// import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleCheck} from "lucide-react";
import { useTranslations } from "next-intl";

export function CreateAccountForm() {
  const t = useTranslations('auth.register')
  const [isPending, setIsPending] = useState(false)
  // const router = useRouter()
  const [isSuccess, setIsSuccess] = useState(false)
  
  const form = useForm<TypeCreateAccountSchema>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      username: "",
      email: "",
      password: ""
    }
  })

  const { isValid } = form.formState

  async function onSubmit(data: TypeCreateAccountSchema) {
    try {
      setIsPending(true)
      const result = await createUser(data)
      
      if (result.error) {
        toast.error(t('errorMessage'))
        form.setError("root", {
          message: result.error
        })
        return
      }

      // Успешная регистрация
      setIsSuccess(true)
      // toast.success("Аккаунт успешно создан!")
      // router.push('/account/login')
      
    } catch (error) {
      console.error(error)
      toast.error("Что-то пошло не так при регистрации")
      form.setError("root", {
        message: "Что-то пошло не так при регистрации"
      })
    } finally {
      setIsPending(false)
    }
  }

  return <AuthWrapper 
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
              name="username"
              render={({field}) => (
                <FormItem>
                  <FormLabel>{t('usernameLabel')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="username"
                      disabled={isPending}
                      {...field}/> 
                  </FormControl>
                  <FormDescription>
                    {t('usernameDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField 
              control={form.control}
              name="password"
              render={({field}) => (
                <FormItem>
                  <FormLabel>{t('passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="********" 
                      disabled={isPending}
                      type="password"
                      {...field}
                    /> 
                  </FormControl>
                  <FormDescription>
                    {t('passwordDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <Button 
              className="mt-2 w-full" 
              disabled={!isValid || isPending}
              type="submit"
            >
              {isPending ? t('registeringButton') : t('submitButton')}
            </Button>
          </form>
      </Form>
    )}
  </AuthWrapper>
}
