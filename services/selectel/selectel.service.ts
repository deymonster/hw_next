import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3'

import { SELECTEL_CONFIG } from './selectel.constants'

const s3 = new S3Client(SELECTEL_CONFIG)

/**
 * Загружает файл в Selectel Object Storage (S3)
 * @param fileBuffer - содержимое файла в виде Buffer
 * @param fileName - имя файла (например, `user-123.jpg`)
 * @param fileType - MIME-тип файла (например, `image/jpeg`)
 * @returns URL загруженного файла
 */
export async function uploadFile(
	fileBuffer: Buffer,
	fileName: string,
	fileType: string
): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: process.env.SELECTEL_BUCKET_NAME, // Название контейнера
		Key: `avatars/${fileName}`, // Путь к файлу в хранилище
		Body: fileBuffer,
		ContentType: fileType,
		ACL: 'public-read' // Делаем файл публичным
	})

	await s3.send(command)

	return `${process.env.SELECTEL_ENDPOINT}/${process.env.SELECTEL_BUCKET_NAME}/avatars/${fileName}`
}

/**
 * Удаляет файл из Selectel S3
 * @param fileName - путь к файлу в хранилище (например, `avatars/user-123.jpg`)
 */
export async function deleteFile(fileName: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: process.env.SELECTEL_BUCKET_NAME!,
		Key: fileName // Путь к файлу
	})

	try {
		await s3.send(command)
		console.log(`Файл ${fileName} удален из Selectel`)
	} catch (error) {
		console.error('Ошибка при удалении файла:', error)
		throw new Error('Не удалось удалить файл из Selectel')
	}
}
