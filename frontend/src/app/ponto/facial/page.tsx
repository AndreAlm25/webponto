"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import FacialRecognitionFlow from "@/components/facial/FacialRecognitionFlow"
import Background from "@/components/facial/Background"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { UserCircle2, Camera, CheckCircle2 } from "lucide-react"

type AuthMode = 'employee' | 'admin'

export default function PontoFacialPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [mode, setMode] = useState<'recognition' | 'registration'>('recognition')
  const [faceRegistered, setFaceRegistered] = useState(false)
  const [checkingFace, setCheckingFace] = useState(true)
  
  useEffect(() => {
    // Redirecionar se não autenticado
    if (!authLoading && !isAuthenticated) {
      toast.error('Você precisa estar logado')
      router.push('/login')
      return
    }

    // Verificar se funcionário tem face cadastrada (backend real)
    const checkFaceRegistration = async () => {
      try {
        const empId = user?.employee?.id || user?.funcionario?.id
        if (!user || !empId) {
          toast.error('Funcionário não identificado')
          setCheckingFace(false)
          return
        }

        const res = await fetch(`/api/employees/${empId}/facial-status`)
        const data = await res.json()

        if (!res.ok || data?.success === false) {
          toast.warning(data?.message || 'Não foi possível verificar status facial')
          setFaceRegistered(false)
          setMode('registration')
          setCheckingFace(false)
          return
        }

        const hasFace = !!data?.hasFace
        setFaceRegistered(hasFace)
        if (hasFace) {
          setMode('recognition')
          toast.success('Reconhecimento facial disponível')
        } else {
          setMode('registration')
          toast.info('Configure seu reconhecimento facial')
        }
      } catch (error) {
        console.error('Erro ao verificar cadastro facial:', error)
        toast.error('Erro ao consultar status facial')
        setFaceRegistered(false)
        setMode('registration')
      } finally {
        setCheckingFace(false)
      }
    }

    checkFaceRegistration()
  }, [user, authLoading, isAuthenticated, router])

  const handleRecognitionSuccess = (result: any) => {
    console.log('[PONTO FACIAL] ✅ Reconhecimento bem-sucedido:', result)
    
    toast.success(`✅ Ponto registrado!`, {
      description: `${user?.name || user?.nome || 'Funcionário'} - ${new Date().toLocaleTimeString('pt-BR')}`,
      duration: 5000
    })
    
    // Redirecionar após 3 segundos
    setTimeout(() => {
      router.push('/dashboard')
    }, 3000)
  }

  const handleRecognitionError = (error: string) => {
    console.log('[PONTO FACIAL] ❌ Erro no reconhecimento:', error)
    toast.error('❌ Erro no reconhecimento', {
      description: error,
      duration: 5000
    })
  }

  const handleRegistrationSuccess = (result: any) => {
    console.log('[PONTO FACIAL] ✅ Cadastro bem-sucedido:', result)
    
    // Atualizar estado local
    setFaceRegistered(true)
    
    toast.success('✅ Face cadastrada com sucesso!', {
      description: `${user?.nome} já pode usar reconhecimento facial`,
      duration: 5000
    })
    
    // Voltar para modo reconhecimento após 2s
    setTimeout(() => {
      setMode('recognition')
    }, 2000)
  }

  const handleRegistrationError = (error: string) => {
    console.log('[PONTO FACIAL] ❌ Erro no cadastro:', error)
    toast.error('❌ Erro ao cadastrar face', {
      description: error,
      duration: 5000
    })
  }

  if (authLoading || checkingFace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-webponto-blue mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const authMode: AuthMode = user.role === 'ADMIN_EMPRESA' || user.role === 'SUPER_ADMIN' ? 'admin' : 'employee'
  const canChangeModes = authMode === 'admin'

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-start bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Background />
      
      <div className="flex flex-col items-center w-full max-w-3xl mx-auto px-4 py-8">
        
        {/* Header com Info do Usuário */}
        <div className="w-full mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-webponto-blue/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-webponto-blue/10 rounded-full">
                <UserCircle2 className="w-8 h-8 text-webponto-blue" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">{user.nome}</h2>
                <p className="text-slate-600">{user.email}</p>
                {user.funcionario && (
                  <p className="text-sm text-slate-500">Matrícula: {user.funcionario.matricula}</p>
                )}
              </div>
              {faceRegistered && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Face Cadastrada</span>
                </div>
              )}
            </div>
            
            {/* Status */}
            <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-webponto-blue/10 to-webponto-yellow/10 rounded-lg border border-webponto-blue/20">
              <Camera className="w-5 h-5 text-webponto-blue" />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  {mode === 'registration' ? '📸 MODO: CADASTRO' : '🎯 MODO: RECONHECIMENTO'}
                </p>
                <p className="text-sm text-slate-600">
                  {mode === 'registration' 
                    ? faceRegistered 
                      ? 'Recadastrando sua face no sistema'
                      : 'Primeira vez - Cadastre sua face para usar o sistema'
                    : 'Registre seu ponto com reconhecimento facial'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seletor de Modo (apenas para admin OU se já tem face) */}
        {(canChangeModes || faceRegistered) && (
          <div className="flex gap-3 mb-6 w-full">
            <Button
              variant={mode === 'recognition' ? 'default' : 'outline'}
              onClick={() => setMode('recognition')}
              className={mode === 'recognition' ? 'flex-1 bg-webponto-blue hover:bg-webponto-blue-dark' : 'flex-1'}
              disabled={!faceRegistered && authMode !== 'admin'}
            >
              <Camera className="w-4 h-4 mr-2" />
              Reconhecimento
            </Button>
            <Button
              variant={mode === 'registration' ? 'default' : 'outline'}
              onClick={() => setMode('registration')}
              className={mode === 'registration' ? 'flex-1 bg-webponto-yellow hover:bg-webponto-yellow-dark text-slate-900' : 'flex-1'}
            >
              <UserCircle2 className="w-4 h-4 mr-2" />
              {faceRegistered ? 'Recadastrar' : 'Cadastro'}
            </Button>
          </div>
        )}

        {/* Instruções */}
        <div className="w-full mb-6 p-6 bg-white rounded-xl shadow-md border-l-4 border-webponto-blue">
          <h3 className="font-bold text-lg text-slate-900 mb-3">
            📋 Instruções:
          </h3>
          <div className="space-y-2 text-slate-700">
            {mode === 'registration' ? (
              <>
                <p>✅ <strong>1.</strong> Clique no botão "Iniciar Câmera"</p>
                <p>✅ <strong>2.</strong> Permita o acesso à câmera</p>
                <p>✅ <strong>3.</strong> Posicione seu rosto no centro (retângulo verde)</p>
                <p>✅ <strong>4.</strong> Aguarde a captura automática (2.5 segundos)</p>
                <p>✅ <strong>5.</strong> Sua face será cadastrada no sistema</p>
              </>
            ) : (
              <>
                <p>✅ <strong>1.</strong> Clique no botão "Iniciar Câmera"</p>
                <p>✅ <strong>2.</strong> Olhe para a câmera</p>
                <p>✅ <strong>3.</strong> Aguarde o reconhecimento automático</p>
                <p>✅ <strong>4.</strong> Seu ponto será registrado</p>
              </>
            )}
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> {mode === 'registration' 
                ? 'Fique em um local bem iluminado para melhor resultado'
                : 'O sistema detecta automaticamente e registra seu ponto'
              }
            </p>
          </div>
        </div>

        {/* Aviso de Primeiro Cadastro */}
        {mode === 'registration' && !faceRegistered && (
          <div className="w-full mb-6 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
            <p className="text-amber-900 font-semibold text-center">
              ⚠️ PRIMEIRO ACESSO
            </p>
            <p className="text-amber-800 text-sm text-center mt-1">
              Você precisa cadastrar sua face antes de usar o reconhecimento
            </p>
          </div>
        )}

        {/* Componente de Reconhecimento Facial */}
        <div className="w-full">
          <FacialRecognitionFlow
            mode={mode}
            authMode={authMode}
            userId={user.funcionario?.id.toString() || user.id.toString()}
            userEmail={user.email}
            onRecognitionSuccess={handleRecognitionSuccess}
            onRecognitionError={handleRecognitionError}
            onRegistrationSuccess={handleRegistrationSuccess}
            onRegistrationError={handleRegistrationError}
          />
        </div>

        {/* Botão Voltar */}
        <div className="mt-8 w-full flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="flex-1 border-webponto-blue text-webponto-blue hover:bg-webponto-blue/10"
          >
            ← Voltar ao Dashboard
          </Button>
        </div>

      </div>
    </div>
  )
}
