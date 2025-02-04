import {z} from 'zod'


 export const changeInfoSchema = z.object({

    username: z
        .string()
        .min(1)
        .regex(/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/),
    // displayName: z
    //     .string()
    //     .min(1)
 })

 export type TypeChangeInfoSchema = z.infer<typeof changeInfoSchema>

 