import { useState, useEffect } from 'react';
import { Department } from '@prisma/client';
import { getDepartments, getDepartmentDevicesCount, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department';
import { IDepartmentCreateInput } from '@/services/department/department.interface';

export type DepartmentWithDeviceCount = Department & {
    deviceCount: number;
}

export function useDepartment() {
    const [departments, setDepartments] = useState<DepartmentWithDeviceCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await getDepartments();
            const departmentsWithCount = await Promise.all(
                data.map(async (dep) => {
                    const count = await getDepartmentDevicesCount(dep.id);
                    return { ...dep, deviceCount: count };
                })
            );
            
            setDepartments(departmentsWithCount);
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
                setDepartments([...departments, { ...newDepartment, deviceCount: 0 }]);
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
                const count = await getDepartmentDevicesCount(updated.id);
                setDepartments(departments.map(dep => 
                    dep.id === id ? { ...updated, deviceCount: count } : dep
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
            const deleted = await deleteDepartment(id);
            if (deleted) {
                setDepartments(departments.filter(dep => dep.id !== id));
            }
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