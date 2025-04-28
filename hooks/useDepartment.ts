import { useState, useEffect } from 'react';
import { Department } from '@prisma/client';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department';
import { IDepartmentCreateInput } from '@/services/department/department.interface';

export function useDepartment() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await getDepartments();
            setDepartments(data);
            setError(null);
        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleCreate = async (data: IDepartmentCreateInput ) => {
        try {
            const newDepartment = await createDepartment(data);
            if (newDepartment) {
                setDepartments([...departments, newDepartment]);
            }
            return newDepartment;
        } catch (error: any) {
            setError(error.message);
            throw error;
        }
    }

    const handleUpdate = async (id: string, data: Partial<IDepartmentCreateInput>) => {
        try {
            const updated = await updateDepartment(id, data);
            if (updated) {
                setDepartments(departments.map(dep => 
                    dep.id === id ? updated : dep
                ));
            }
            return updated;
        } catch (error: any) {
            setError(error.message);
            throw error;
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteDepartment(id);
            setDepartments(departments.filter(dep => dep.id !== id));
        } catch (error: any) {
            setError(error.message);
            throw error;
        }
    }
    return {
        departments,
        loading,
        error,
        refresh: fetchDepartments,
        create: handleCreate,
        update: handleUpdate,
        delete: handleDelete,
    }
    
}