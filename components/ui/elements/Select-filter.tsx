'use client'

import { SelectItem } from "@radix-ui/react-select"
import { Select, SelectContent, SelectTrigger, SelectValue } from "../select"

export const SelectFilter = ({
    options,
    selectedValue,
    onValueChange,
    placeholder,
    translateOption = (opt) => opt
}: {
    options: string[]
    selectedValue?: string
    onValueChange: (value?: string) => void
    placeholder: string
    translateOption?: (option: string) => string
}) => {
    return (
        <Select
            value={selectedValue}
            onValueChange={(value) => onValueChange(value === "all" ? undefined : value)}    
        >
            <SelectTrigger className='w-[180px]'>
                <SelectValue 
                    placeholder={placeholder}>
                        {selectedValue === undefined ? 'All' : selectedValue}
                </SelectValue>
            </SelectTrigger>
            <SelectContent className='min-w-[180px]'>
            <SelectItem value='all' className='text-foreground'>{placeholder}</SelectItem>
                {options.map((option) => (
                    <SelectItem key={option} value={option} className='text-foreground py-2 pl-2'>
                        {translateOption(option)}
                    </SelectItem>
                ))}
            </SelectContent>

        </Select>
    )
}