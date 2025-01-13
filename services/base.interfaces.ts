// Интерфейс для базовых операций CRUD
export interface IBaseRepository<T, TCreateInput, TFindManyArgs, TId> {
    getAll(params?: TFindManyArgs): Promise<T[]>;
    getById(id: TId): Promise<T | null>;
    create(data: TCreateInput): Promise<T>;
    update(id: TId, data: Partial<TCreateInput>): Promise<T>;
    delete(id: TId): Promise<T>;
  }
  
// Интерфейс для модели (делегата)
export interface IBaseDelegate<T, TFindManyArgs, TCreateInput, TId> {
    findMany(params?: TFindManyArgs): Promise<T[]>;
    findUnique(params: { where: { id: TId } }): Promise<T | null>;
    create(params: { data: TCreateInput }): Promise<T>;
    update(params: { where: { id: TId }; data: Partial<TCreateInput> }): Promise<T>;
    delete(params: { where: { id: TId } }): Promise<T>;
}
  
