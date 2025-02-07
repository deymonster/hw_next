import {z} from 'zod'
import { SmtpProvider } from '@prisma/client'


 export const changeSmtpSettingsSchema = z.object({

   provider: z.nativeEnum(SmtpProvider),
   host: z.string().min(1),
   port: z.number().min(1),
   secure: z.boolean(),
   username: z.string().min(1),
   password: z.string().min(1),
   fromEmail: z.string().email(),
   fromName: z.string().nullable()
    
 })

 export type TypeChangeSmtpSettingsSchema = z.infer<typeof changeSmtpSettingsSchema>

 