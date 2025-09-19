import { Event, Prisma } from '@prisma/client'

export interface IEventCreateInput
	extends Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'metadata'> {
	userId: string
	metadata?: Prisma.JsonValue | null
}

export interface IEventFindManyArgs {
	where?: Prisma.EventWhereInput
	orderBy?: Prisma.EventOrderByWithRelationInput
	take?: number
	skip?: number
	include?: Prisma.EventInclude
}

export interface IEventRepository {
	create(data: IEventCreateInput): Promise<Event>
	findMany(args?: IEventFindManyArgs): Promise<Event[]>
	findById(id: string): Promise<Event | null>
	findByUserId(
		userId: string,
		options?: {
			take?: number
			skip?: number
			orderBy?: string
			orderDir?: 'asc' | 'desc'
		}
	): Promise<Event[]>
	findAndMarkAsRead(userId: string, take?: number): Promise<Event[]>
	markAsRead(id: string): Promise<Event>
	markAllAsRead(userId: string): Promise<Prisma.BatchPayload>
	getUnreadCount(userId: string): Promise<number>
	count(where?: Prisma.EventWhereInput): Promise<number>
	delete(id: string): Promise<Event>
	deleteMany(userId: string): Promise<Prisma.BatchPayload>
	confirmHardwareChangeEvents(deviceId: string): Promise<{ count: number }>
	findUnconfirmedHardwareChangeEvents(deviceId: string): Promise<Event[]>
}

export interface EventWithDevice extends Event {
	device?: {
		id: string
		name: string
		ipAddress: string
	} | null
}
