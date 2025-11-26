import { z } from 'zod'

export const scanDeviceSchema = z.object({
	subnet: z
		.string()
		.optional()
		.refine(value => !value || /^(?:\d{1,3}\.){3}0\/24$/.test(value), {
			message: 'Subnet must be in format: xxx.xxx.xxx.0/24'
		}),
	timeout: z.number().int().positive().optional(),
	concurrency: z.number().int().positive().optional(),
	agentPort: z.number().int().positive().optional(),
	targetAgentKey: z.string().optional()
})

export type TypeScanDeviceSchema = z.infer<typeof scanDeviceSchema>
