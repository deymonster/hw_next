import type { PropsWithChildren } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../card"

interface FormWrapperProps {
    heading: string
}

export function FormWrapper({ heading, children }: PropsWithChildren<FormWrapperProps>){
    return (
        <Card>
            <CardHeader className='p-4'>
                <CardTitle className='text-lg'>{heading}</CardTitle>
            </CardHeader>
            <CardContent className='p-0'>{children}</CardContent>
        </Card>

    )
    
}