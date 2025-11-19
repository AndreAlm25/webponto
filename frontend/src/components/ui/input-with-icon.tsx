import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface InputWithIconProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode
  label: string
  containerClassName?: string
  labelClassName?: string
  error?: string
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, icon, label, containerClassName, labelClassName, error, ...props }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label 
          htmlFor={props.id} 
          className={cn("text-sm font-medium flex items-center space-x-2", labelClassName)}
        >
          {icon}
          <span>{label}</span>
        </Label>
        <Input
          className={cn(error && "border-red-500", className)}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)
InputWithIcon.displayName = "InputWithIcon"

export { InputWithIcon }
