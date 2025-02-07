import {z} from 'zod'
import { SmtpProvider } from '@prisma/client'


 export const changeNotificationsSchema = z.object({

   siteNotifications: z.boolean(),
   telegramNotifications: z.boolean()
    
 })

 export type TypeChangeNotificationsSettingsSchema = z.infer<typeof changeNotificationsSchema>

 