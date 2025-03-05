import { addDeviceTarget, getDeviceInfo } from "@/app/actions/prometheus.actions"
import { useState } from "react"


export const useDeviceInfo = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deviceInfo, setDeviceInfo] = useState<any>(null)

    const getInfo = async (ipAddress: string) => {
        try {
            setIsLoading(true)
            setError(null)

            const result =  await getDeviceInfo(ipAddress)

            if (!result.success) {
                throw new Error(result.error)
            }

            setDeviceInfo(result.data)
            console.log('Device Info', result.data)
            return result.data
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to scan device'
            setError(errorMessage)
            console.error('Scanning error:', error)
            return null
        } finally {
            setIsLoading(false)
        }
    } 

    const addDevice = async (ipAddress: string) => {
        try {
            const result = await addDeviceTarget(ipAddress)
            if (!result.success) {
                throw new Error(result.error)
            }
            return true
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to add device'
            setError(errorMessage)
            console.error('Add device error:', error)
            return false
        }
    }

    return {
        getInfo,
        addDevice,
        isLoading,
        error,
        deviceInfo
    }
}