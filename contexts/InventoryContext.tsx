'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface InventoryState {
    selectedDepartments: string[]
    selectedDevices: string[]
    step: number
}

interface InventoryContextType {
    state: InventoryState
    setSelectedDepartments: (departments: string[]) => void
    setSelectedDevices: (devices: string[]) => void
    setStep: (step: number) => void
    resetState: () => void
}

const initialState: InventoryState = {
    selectedDepartments: [],
    selectedDevices: [],
    step: 0
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

export function InventoryProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<InventoryState>(initialState)

    const setSelectedDepartments = (departments: string[]) => {
        setState(prev => ({ ...prev, selectedDepartments: departments }))
    }

    const setSelectedDevices = (devices: string[]) => {
        setState(prev => ({ ...prev, selectedDevices: devices }))
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
            resetState
        }}>
            {children}
        </InventoryContext.Provider>
    )
}

export function useInventory() {
    const context = useContext(InventoryContext)
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider')
    }
    return context
}