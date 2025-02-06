import {z} from 'zod'


 export const changeNotificationsSchema = z.object({

    siteNotifications: z.boolean(),
    telegramNotifications: z.boolean(),
    
 })

 export type TypeChangeNotificationsSchema = z.infer<typeof changeNotificationsSchema>

 