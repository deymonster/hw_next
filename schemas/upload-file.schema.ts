import { z } from 'zod'

const MAX_FILE_SIZE = 20 * 1024 * 1024

export const UploadFileSchema = z.object({
	file: z
		.union([
			z
				.custom<File>(file => file instanceof File)
				.refine(
					file => !file || (file as File).size <= MAX_FILE_SIZE,
					'File size is too large'
				),
			z.string().transform(value => (value === '' ? undefined : value))
		])
		.optional()
})

export type TypeUploadFileSchema = z.infer<typeof UploadFileSchema>
