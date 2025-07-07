import { FileSystemAdapter, HttpClient } from './alert-rules.config.types'

import * as fs from 'fs/promises'

/**
 * Дефолтный адаптер файловой системы
 */
export const fsAdapter: FileSystemAdapter = {
	readFile: async (path: string) => fs.readFile(path, 'utf8'),
	writeFile: async (path: string, content: string) =>
		fs.writeFile(path, content, 'utf8')
}

/**
 * Дефолтный HTTP-клиент (fetch API)
 */
export const fetchAdapter: HttpClient = {
	post: async (url: string, init?: RequestInit) => {
		const response = await fetch(url, {
			method: 'POST',
			...init
		})
		return response
	}
}
