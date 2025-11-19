import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export interface CheckboxWithIconProps {
  icon: React.ReactNode
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  containerClassName?: string
  labelClassName?: string
  error?: string
}

const CheckboxWithIcon = React.forwardRef<HTMLButtonElement, CheckboxWithIconProps>(
  ({ 
    icon, 
    label, 
    description, 
    checked, 
    onCheckedChange, 
    containerClassName, 
    labelClassName, 
    error 
  }, ref) => {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={label}
            checked={checked}
            onCheckedChange={onCheckedChange}
            ref={ref}
          />
          <Label 
            htmlFor={label}
            className={cn("text-sm font-medium flex items-center space-x-2 cursor-pointer", labelClassName)}
          >
            {icon}
            <span>{label}</span>
          </Label>
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">{description}</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)
CheckboxWithIcon.displayName = "CheckboxWithIcon"

export { CheckboxWithIcon }
