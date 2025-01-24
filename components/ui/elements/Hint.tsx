import type { PropsWithChildren } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../tooltip"

interface HintProps {
    label: string
    asChild?: boolean
    side?: 'top' | 'bottom' | 'left' | 'right'
    align?: 'start' | 'center' | 'end'
}

export function Hint({ children, label, asChild, side, align }: PropsWithChildren<HintProps>) {
  return <TooltipProvider>
    <Tooltip delayDuration={0}>
        <TooltipTrigger asChild={asChild}>
            {children}
        </TooltipTrigger>
        <TooltipContent className="bg-secondary" side={side} align={align}>
            <p className="font-semibold">{label}</p>
        </TooltipContent>
    </Tooltip>

  </TooltipProvider>
}
