import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

export interface SelectWithCreateProps {
  icon: React.ReactNode
  label: string
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  options: { id: string; name: string }[]
  onCreateNew: (name: string) => void
  containerClassName?: string
  labelClassName?: string
  error?: string
}

const SelectWithCreate = React.forwardRef<HTMLDivElement, SelectWithCreateProps>(
  ({ 
    icon, 
    label, 
    placeholder, 
    value, 
    onValueChange, 
    options, 
    onCreateNew, 
    containerClassName, 
    labelClassName, 
    error 
  }, ref) => {
    const [showNewInput, setShowNewInput] = React.useState(false)
    const [newItemName, setNewItemName] = React.useState('')

    // Debug: Log options quando mudarem
    React.useEffect(() => {
      console.log(`[SelectWithCreate] ${label} - Options:`, options)
    }, [options, label])

    const handleCreateNew = () => {
      if (newItemName.trim()) {
        onCreateNew(newItemName.trim())
        setNewItemName('')
        setShowNewInput(false)
      }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleCreateNew()
      }
    }

    const handleCancel = () => {
      setShowNewInput(false)
      setNewItemName('')
    }

    return (
      <div className={cn("space-y-2", containerClassName)} ref={ref}>
        <div className="flex items-center justify-between">
          <Label className={cn("text-sm font-medium flex items-center space-x-2", labelClassName)}>
            {icon}
            <span>{label}</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowNewInput(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Novo
          </Button>
        </div>
        
        {showNewInput ? (
          <div className="space-y-3">
            <Input
              placeholder={`Nome do ${label.toLowerCase()}`}
              value={newItemName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewItemName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full"
            />
            <div className="flex space-x-2 justify-end">
              <Button
                type="button"
                size="sm"
                onClick={handleCreateNew}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Select
            value={value}
            onValueChange={onValueChange}
          >
            <SelectTrigger className={cn(error && "border-red-500")}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.length === 0 ? (
                <div className="p-2 text-sm text-gray-500">Nenhum item cadastrado</div>
              ) : (
                options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        )}
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    )
  }
)
SelectWithCreate.displayName = "SelectWithCreate"

export { SelectWithCreate }
