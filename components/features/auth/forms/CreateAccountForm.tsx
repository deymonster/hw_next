'use client'
import { useForm } from "react-hook-form";
import { AuthWrapper } from "../AuthWrapper";
import { TypeCreateAccountSchema } from "@/schemas/auth/create-account.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAccountSchema } from "@/schemas/auth/create-account.schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createUser } from "@/app/actions/auth";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateAccountForm() {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()
  
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
        toast.error(result.error)
        form.setError("root", {
          message: result.error
        })
        return
      }

      // Успешная регистрация
      toast.success("Аккаунт успешно создан!")
      router.push('/account/login')
      
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
    heading="Регистрация в NITRINOnet Monitoring"
    backButtonLabel="Есть учетная запись? Войти"
    backButtonHref="/account/login"
  >
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-y-3">
        <FormField 
          control={form.control}
          name="username"
          render={({field}) => (
            <FormItem>
              <FormLabel>Имя пользователя</FormLabel>
              <FormControl>
                <Input placeholder="username" {...field}/> 
              </FormControl>
              <FormDescription>
                Это имя будет отображаться в вашем профиле
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
              <FormLabel>Почта</FormLabel>
              <FormControl>
                <Input placeholder="username@example.com" {...field}/> 
              </FormControl>
              <FormDescription>
                На этот адрес будут приходить уведомления
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
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <Input 
                  placeholder="********" 
                  type="password"
                  {...field}
                /> 
              </FormControl>
              <FormDescription>
                Минимум 8 символов, включая буквы и цифры
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
          {isPending ? "Создание..." : "Создать"}
        </Button>
      </form>
    </Form>
  </AuthWrapper>
}
