export const SELECTEL_CONFIG = {
	region: process.env.SELECTEL_REGION || 'ru-1',
	endpoint:
		process.env.SELECTEL_ENDPOINT || 'https://s3.ru-1.storage.selcloud.ru',
	credentials: {
		accessKeyId: process.env.SELECTEL_ACCESS_KEY_ID as string,
		secretAccessKey: process.env.SELECTEL_SECRET_ACCESS_KEY as string
	}
} as const
