'use client'

import { Device } from '@prisma/client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface InventoryState {
    selectedDepartments: string[]
    selectedDevices: Device[]
    step: number
    inventoryItems: Array<{
        deviceId: string
        deviceName: string
        ipAddress: string
        processor: string | null
        motherboard: any | null
        memory: any | null
        storage: any | null
        networkCards: any | null
        videoCards: any | null
        diskUsage: any | null
        departmentId: string | null
        employeeId: string | null
        serialNumber: string | null
    }>
}

interface InventoryContextType {
    state: InventoryState
    setSelectedDepartments: (departments: string[]) => void
    setSelectedDevices: (devices: Device[]) => void
    setInventoryItems: (items: InventoryState['inventoryItems']) => void
    addInventoryItem: (item: InventoryState['inventoryItems'][0]) => void
    setStep: (step: number) => void
    resetState: () => void
}

const initialState: InventoryState = {
    selectedDepartments: [],
    selectedDevices: [],
    step: 0,
    inventoryItems: []
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<InventoryState>(initialState)

    const setSelectedDepartments = (departments: string[]) => {
        setState(prev => ({ ...prev, selectedDepartments: departments }))
    }

    const setSelectedDevices = (devices: Device[]) => {
        setState(prev => ({ ...prev, selectedDevices: devices }))
    }

    const setInventoryItems = (items: InventoryState['inventoryItems']) => {
        setState(prev => ({ ...prev, inventoryItems: items }))
    }

    const addInventoryItem = (item: InventoryState['inventoryItems'][0]) => {
        setState(prev => ({
            ...prev,
            inventoryItems: [...prev.inventoryItems, item]
        }))
    }

    const setStep = (step: number) => {
        setState(prev => ({ ...prev, step }))
    }

    const resetState = () => {
        setState(initialState)
    }

    return (
        <InventoryContext.Provider value={{
            state,
            setSelectedDepartments,
            setSelectedDevices,
            setStep,
            resetState,
            setInventoryItems,
            addInventoryItem
        }}>
            {children}
        </InventoryContext.Provider>
    )
}

export function useInventoryContext() {
    const context = useContext(InventoryContext)
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider')
    }
    return context
}