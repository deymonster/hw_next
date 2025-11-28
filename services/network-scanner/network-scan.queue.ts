import Redis from 'ioredis'
import { randomUUID } from 'node:crypto'

import { services } from '..'
import { LoggerService } from '../logger/logger.interface'
import { NetworkScannerOptions } from './network-scanner.interfaces'

const redisPublisher = process.env.REDIS_URL
        ? new Redis(process.env.REDIS_URL, { lazyConnect: true })
        : new Redis({
                        host: process.env.REDIS_HOST || 'localhost',
                        port: Number(process.env.REDIS_PORT) || 6379,
                        password: process.env.REDIS_PASSWORD,
                        lazyConnect: true
                })

const JOB_KEY_PREFIX = 'network_scan_job:'
const JOB_CHANNEL_PREFIX = 'network_scan_job_channel:'

export interface NetworkScanJobState {
	id: string
	status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
	progress: number
	result?: unknown
	error?: string | null
	options?: Record<string, unknown>
	updatedAt: number
	userId?: string | null
}

interface QueueJobPayload {
	id: string
	options?: NetworkScannerOptions
	userId?: string
}

class NetworkScanQueue {
	private readonly queue: QueueJobPayload[] = []
	private processing = false
	private currentJobId: string | null = null
	private readonly cancelledJobs = new Set<string>()

	enqueue(job: QueueJobPayload) {
                this.queue.push(job)
                void this.saveState(job.id, {
                        id: job.id,
                        status: 'QUEUED',
                        progress: 0,
                        updatedAt: Date.now(),
                        userId: job.userId,
                        options: job.options ? { ...job.options } : undefined
                })
                this.processNext()
        }

	async cancel(jobId: string) {
		this.cancelledJobs.add(jobId)
		if (this.currentJobId === jobId) {
			services.infrastructure.network_scanner.cancelScan()
		}
		await services.data.network_scan_job.updateJob(jobId, {
			status: 'CANCELLED',
			error: 'Cancelled by user'
		})
		await this.saveState(jobId, {
			id: jobId,
			status: 'CANCELLED',
			progress: 0,
			updatedAt: Date.now(),
			error: 'Cancelled by user'
		})
	}

	private async saveState(
		jobId: string,
		state: Partial<NetworkScanJobState>
	) {
		try {
			const payload = JSON.stringify(state)
			await redisPublisher.set(
				`${JOB_KEY_PREFIX}${jobId}`,
				payload,
				'EX',
				60 * 60
			)
			await redisPublisher.publish(
				`${JOB_CHANNEL_PREFIX}${jobId}`,
				JSON.stringify(state)
			)
		} catch (error) {
			await services.infrastructure.logger.error(
				LoggerService.NETWORK_SCANNER,
				'Failed to persist scan state',
				{ jobId, error }
			)
		}
	}

	private async processNext() {
		if (this.processing) return
		const job = this.queue.shift()
		if (!job) return

		this.processing = true
		this.currentJobId = job.id
		if (this.cancelledJobs.has(job.id)) {
			await services.infrastructure.logger.warn(
				LoggerService.NETWORK_SCANNER,
				'Skipping cancelled job before start',
				{ jobId: job.id }
			)
			await services.data.network_scan_job.updateJob(job.id, {
				status: 'CANCELLED',
				progress: 0,
				error: 'Cancelled before start'
			})
			await this.saveState(job.id, {
				id: job.id,
				status: 'CANCELLED',
				progress: 0,
				updatedAt: Date.now()
			})
			this.processing = false
			this.currentJobId = null
			this.queue.length > 0 && setImmediate(() => this.processNext())
			return
		}
		const logger = services.infrastructure.logger
		await logger.info(LoggerService.NETWORK_SCANNER, 'Starting job', {
			jobId: job.id,
			options: job.options
		})
		try {
			await services.data.network_scan_job.updateJob(job.id, {
				status: 'RUNNING'
			})
			await this.saveState(job.id, {
				id: job.id,
				status: 'RUNNING',
				progress: 0,
				updatedAt: Date.now()
			})

			const results =
				await services.infrastructure.network_scanner.scanNetwork(
					{ ...job.options, jobId: job.id },
					async progress => {
						const progressValue = Math.min(
							100,
							Math.round(
								(progress.processed / progress.total) * 100
							)
						)
						await services.data.network_scan_job.updateJob(job.id, {
							progress: progressValue
						})
						await this.saveState(job.id, {
							id: job.id,
							status: 'RUNNING',
							progress: progressValue,
							updatedAt: Date.now()
						})
					}
				)

			if (this.cancelledJobs.has(job.id)) {
				await logger.warn(
					LoggerService.NETWORK_SCANNER,
					'Job cancelled during execution',
					{ jobId: job.id }
				)
				await this.saveState(job.id, {
					id: job.id,
					status: 'CANCELLED',
					progress: 0,
					updatedAt: Date.now()
				})
			} else {
				await services.data.network_scan_job.updateJob(job.id, {
					status: 'COMPLETED',
					progress: 100,
					result: results
				})
				await logger.info(
					LoggerService.NETWORK_SCANNER,
					'Job completed',
					{ jobId: job.id, discovered: results.length }
				)
				await this.saveState(job.id, {
					id: job.id,
					status: 'COMPLETED',
					progress: 100,
					updatedAt: Date.now(),
					result: results
				})
			}
		} catch (error) {
			await services.infrastructure.logger.error(
				LoggerService.NETWORK_SCANNER,
				'Job failed',
				{ jobId: job.id, error }
			)
			await services.data.network_scan_job.updateJob(job.id, {
				status: 'FAILED',
				error: error instanceof Error ? error.message : 'Unknown error'
			})
			await this.saveState(job.id, {
				id: job.id,
				status: 'FAILED',
				progress: 0,
				error: error instanceof Error ? error.message : 'Unknown error',
				updatedAt: Date.now()
			})
		} finally {
			this.cancelledJobs.delete(job.id)
			this.processing = false
			this.currentJobId = null
			if (this.queue.length > 0) {
				setImmediate(() => this.processNext())
			}
		}
	}

	generateJobId() {
		return randomUUID()
	}
}

export const networkScanQueue = new NetworkScanQueue()
export const networkScanJobChannelPrefix = JOB_CHANNEL_PREFIX
export const networkScanJobKeyPrefix = JOB_KEY_PREFIX

export async function readJobState(
	jobId: string
): Promise<NetworkScanJobState | null> {
	const cached = await redisPublisher.get(`${JOB_KEY_PREFIX}${jobId}`)
	if (cached) {
		const parsed = JSON.parse(cached) as Partial<NetworkScanJobState>
		return {
			id: jobId,
			status: parsed.status || 'QUEUED',
			progress: parsed.progress ?? 0,
			result: parsed.result,
			error: parsed.error,
			options: parsed.options,
			updatedAt: parsed.updatedAt || Date.now(),
			userId: parsed.userId
		}
	}

	const job = await services.data.network_scan_job.findJob(jobId)
	if (!job) return null

	return {
		id: job.id,
		status: job.status as NetworkScanJobState['status'],
		progress: job.progress,
		result: job.result,
		error: job.error,
		options: (job.options as Record<string, unknown>) || undefined,
		updatedAt: job.updatedAt.getTime(),
		userId: job.userId
	}
}
