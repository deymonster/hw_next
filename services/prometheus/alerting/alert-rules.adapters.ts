import fetch, { type RequestInit } from 'cross-fetch'
import type { Agent as HttpsAgent } from 'https'
import { FileSystemAdapter, HttpClient } from './alert-rules.config.types'

import * as fs from 'fs/promises'

type FetchRequestInit = RequestInit & { agent?: HttpsAgent }

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
export const createFetchAdapter = (options?: { agent?: HttpsAgent }): HttpClient => ({
        post: async (url: string, init?: FetchRequestInit) => {
                const requestInit: FetchRequestInit = {
                        method: 'POST',
                        ...(init || {})
                }

                if (options?.agent) {
                        requestInit.agent = options.agent
                }

                return fetch(url, requestInit)
        }
})

export const fetchAdapter = createFetchAdapter()
