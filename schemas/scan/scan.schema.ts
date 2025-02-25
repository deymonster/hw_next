import { z } from "zod";

export const scanDeviceSchema = z.object({
    subnet: z.string()
            .optional()
            .refine(
                (value) => !value || /^(?:\d{1,3}\.){3}0\/24$/.test(value),
                {
                    message: "Subnet must be in format: xxx.xxx.xxx.0/24"
                }
            )
})


export type TypeScanDeviceSchema = z.infer<typeof scanDeviceSchema>