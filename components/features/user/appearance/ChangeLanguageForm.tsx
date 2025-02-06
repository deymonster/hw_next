'use client'

import { CardContainer } from "@/components/ui/elements/CardContainer"
import { Form, FormField } from "@/components/ui/form"
import { Select, SelectContent, SelectValue, SelectItem, SelectTrigger } from "@/components/ui/select"
import { setLanguage } from "@/libs/i18n/languages"
import { TypeChangeLanguageSchema, changeLanguageSchema } from "@/schemas/user/change-language.schema"
import { zodResolver } from "@hookform/resolvers/zod"
import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"


const languages  = {
    ru: 'Русский',
    en: 'English'
}
export function ChangeLanguageForm() {
    const t = useTranslations('dashboard.settings.appearance.language')

    const [isPending, startTransition] = useTransition()
    const locale = useLocale()


    const form = useForm<TypeChangeLanguageSchema>({
        resolver: zodResolver(changeLanguageSchema),
        values: {
            language: locale as TypeChangeLanguageSchema['language']
        }
    })

    function onSubmit(data: TypeChangeLanguageSchema) {
        startTransition(async () => {
            try{
                await setLanguage(data.language)
            }catch(error){
                toast.success(t('succesMessage'))
            }
            
        })
    }
    return <CardContainer 
                heading={t('heading')}
                description={t('description')}
                rightContent={
                    <Form {...form}>
                            <FormField 
                                control={form.control} 
                                name='language' 
                                render={({field}) => (
                                    <Select
                                        onValueChange={value => {
                                            field.onChange(value)
                                            form.handleSubmit(onSubmit)()
                                        }}
                                        value={field.value}
                                    >
                                        <SelectTrigger className='w-[180px]'>
                                            <SelectValue  placeholder={t('selectPlaceholder')}/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(languages).map(([code, name]) => (
                                                <SelectItem 
                                                    key={code} 
                                                    value={code}
                                                    disabled={isPending}
                                                >
                                                    {name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                            
                            />
                        
                    </Form>
                }
    />
}