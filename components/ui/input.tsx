import { cn } from "@/utils/tw-merge"
import { type ComponentProps, forwardRef } from "react"


const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn([
          // Базовые стили
          'flex h-10 w-full rounded-md border border-border',
          'bg-input px-3 py-2 text-sm',
          
          // Файловые стили
          'file:border-0 file:bg-transparent file:text-sm',
          'file:font-medium file:text-foreground',
          
          // Плейсхолдер и фокус
          'placeholder:text-muted-foreground',
          'focus:border-primary',
          'focus-visible:outline-none',
          
          // Состояния
          'disabled:cursor-not-allowed disabled:opacity-50'
        ].join(' '),
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
