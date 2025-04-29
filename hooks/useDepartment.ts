import { useState, useEffect } from 'react';
import { Department } from '@prisma/client';
import { getDepartments, getDepartmentDevicesCount, createDepartment, updateDepartment, deleteDepartment } from '@/app/actions/department';
import { IDepartmentCreateInput } from '@/services/department/department.interface';
import { useQuery, useQueryClient } from '@tanstack/react-query'

export type DepartmentWithDeviceCount = Department & {
    deviceCount: number;
}

export function useDepartment() {
    const queryClient = useQueryClient()
    
    const {
        data: departments = [],
        isLoading,
        error,
        refetch: refresh
    } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const data = await getDepartments();
            const departmentsWithCount = await Promise.all(
                data.map(async (dep) => {
                    const count = await getDepartmentDevicesCount(dep.id);
                    return { ...dep, deviceCount: count };
                })
            );
            return departmentsWithCount;
        }
    })

    const handleCreate = async (data: IDepartmentCreateInput ) => {
        try {
            const newDepartment = await createDepartment(data);
            queryClient.setQueryData(['departments'], (old: DepartmentWithDeviceCount[]) => {
                return [...(old || []), { ...newDepartment, deviceCount: 0 }];
            });
            return newDepartment;
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }

    const handleUpdate = async (id: string, data: Partial<IDepartmentCreateInput>) => {
        try {
            const updated = await updateDepartment(id, data);
            const count = await getDepartmentDevicesCount(updated.id);

            queryClient.setQueryData(['departments'], (old: DepartmentWithDeviceCount[]) => {
                return (old || []).map(dep => 
                    dep.id === id ? { ...updated, deviceCount: count } : dep
                );
            });
            return updated;
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }

    const handleDelete = async (id: string) => {
        try {
            queryClient.setQueryData(['departments'], (old: DepartmentWithDeviceCount[]) => {
                return (old || []).filter(dep => dep.id !== id);
            });
            await deleteDepartment(id);
        } catch (error: any) {
            queryClient.invalidateQueries({ queryKey: ['departments'] });
            throw error;
        }
    }
    return {
        departments,
        loading: isLoading,
        error,
        refresh,
        create: handleCreate,
        update: handleUpdate,
        delete: handleDelete,
    }
    
}