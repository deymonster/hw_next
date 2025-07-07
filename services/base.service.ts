import { PrismaClient } from '@prisma/client'

import { IBaseDelegate, IBaseRepository } from './base.interfaces'

export abstract class BaseRepository<
	T, // Тип сущности (например, User)
	TCreateInput, // Тип данных для создания
	TFindManyArgs, // Тип параметров для поиска
	TDelegate extends IBaseDelegate<T, TFindManyArgs, TCreateInput, TId>, // Интерфейс делегата
	TId = string // Идентификатор сущности
> implements IBaseRepository<T, TCreateInput, TFindManyArgs, TId>
{
	protected model: TDelegate

	constructor(
		protected prisma: PrismaClient,
		getModel: (prisma: PrismaClient) => TDelegate
	) {
		this.model = getModel(prisma)
	}

	async findMany(params?: TFindManyArgs): Promise<T[]> {
		return await this.model.findMany(params)
	}

	async findById(id: TId): Promise<T | null> {
		return await this.model.findUnique({ where: { id } })
	}

	async create(data: TCreateInput): Promise<T> {
		return await this.model.create({ data })
	}

	async update(id: TId, data: Partial<TCreateInput>): Promise<T> {
		return await this.model.update({ where: { id }, data })
	}

	async delete(id: TId): Promise<T> {
		return await this.model.delete({ where: { id } })
	}
}
