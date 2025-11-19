"use client"
// Componente: Menu suspenso de ações do funcionário
// - Baseado no projeto antigo (ponto)
// - Menu dropdown com ícones
// - Modais de confirmação para ações destrutivas

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Settings, Edit, UserX, Trash2, CameraOff, AlertTriangle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Employee {
  id: string
  name: string
  email?: string
  roleTitle?: string | null
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
}

interface EmployeeActionsMenuProps {
  employee: Employee
  onEdit: (employee: Employee) => void
  onDeactivate: (employee: Employee) => void
  onDelete: (employee: Employee) => void
  onDisableFaceRecognition?: (employee: Employee) => void
  hasFaceRegistered?: boolean
}

export default function EmployeeActionsMenu({
  employee,
  onEdit,
  onDeactivate,
  onDelete,
  onDisableFaceRecognition,
  hasFaceRegistered = false,
}: EmployeeActionsMenuProps) {
  const router = useRouter()
  const params = useParams<{ company?: string }>()
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [showDisableFaceConfirm, setShowDisableFaceConfirm] = useState(false)

  const handleEdit = () => {
    onEdit(employee)
    setShowMenu(false)
  }

  const handleDeactivate = () => {
    setShowDeactivateConfirm(true)
    setShowMenu(false)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
    setShowMenu(false)
  }

  const handleDisableFaceRecognition = () => {
    setShowDisableFaceConfirm(true)
    setShowMenu(false)
  }

  const handleSendMessage = async () => {
    setShowMenu(false)
    
    // Criar ou buscar thread com o funcionário
    try {
      const token = localStorage.getItem('token')
      const api = process.env.NEXT_PUBLIC_API_URL
      
      // Criar/buscar thread usando novo endpoint
      const response = await fetch(`${api}/api/messages/threads/employee/${employee.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const thread = await response.json()
        // Redirecionar para conversa
        const company = params.company || ''
        router.push(`/admin/${encodeURIComponent(company)}/mensagens/${thread.id}`)
      } else {
        console.error('[EmployeeActionsMenu] Erro ao criar thread')
      }
    } catch (error) {
      console.error('[EmployeeActionsMenu] Erro ao buscar thread:', error)
    }
  }

  const confirmDeactivate = () => {
    onDeactivate(employee)
    setShowDeactivateConfirm(false)
  }

  const confirmDelete = () => {
    onDelete(employee)
    setShowDeleteConfirm(false)
  }

  const confirmDisableFaceRecognition = () => {
    if (onDisableFaceRecognition) {
      onDisableFaceRecognition(employee)
    }
    setShowDisableFaceConfirm(false)
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Ações do funcionário"
        >
          <Settings className="h-4 w-4" />
        </Button>

        {showMenu && (
          <>
            {/* Backdrop para fechar ao clicar fora */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            
            {/* Menu dropdown - Ícone + texto curto */}
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
              <div className="py-1">
                <button
                  onClick={handleEdit}
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
                  title="Editar Funcionário"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </button>

                <button
                  onClick={handleSendMessage}
                  className="flex items-center w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                  title="Enviar Mensagem"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Mensagem
                </button>

                {hasFaceRegistered && (
                  <button
                    onClick={handleDisableFaceRecognition}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="Excluir Reconhecimento Facial"
                  >
                    <CameraOff className="h-4 w-4 mr-2" />
                    Excluir
                  </button>
                )}

                {employee.status === 'ACTIVE' ? (
                  <button
                    onClick={handleDeactivate}
                    className="flex items-center w-full px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/30 transition-colors"
                    title="Desativar Funcionário"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Desativar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onDeactivate(employee)
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                    title="Reativar Funcionário"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Reativar
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Excluir Funcionário"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de confirmação: Desativar */}
      {showDeactivateConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-950/30 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-yellow-900 dark:text-yellow-100">
                    {employee.status === 'ACTIVE' ? 'Desativar' : 'Reativar'} Funcionário
                  </CardTitle>
                  <CardDescription>Esta ação pode ser revertida</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja {employee.status === 'ACTIVE' ? 'desativar' : 'reativar'} o funcionário <strong>{employee.name}</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeactivateConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDeactivate}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {employee.status === 'ACTIVE' ? 'Desativar' : 'Reativar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de confirmação: Excluir */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900 dark:text-red-100">Excluir Funcionário</CardTitle>
                  <CardDescription>Esta ação não pode ser desfeita</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja excluir permanentemente o funcionário <strong>{employee.name}</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de confirmação: Excluir Reconhecimento Facial */}
      {showDisableFaceConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center">
                  <CameraOff className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-900 dark:text-red-100">Excluir Reconhecimento Facial</CardTitle>
                  <CardDescription>Esta ação não pode ser desfeita</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja excluir o reconhecimento facial de <strong>{employee.name}</strong>?
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDisableFaceConfirm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDisableFaceRecognition}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
