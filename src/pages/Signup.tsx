import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({
        title: 'Senhas divergentes',
        description: 'A confirmação de senha não confere.',
        variant: 'destructive',
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter no mínimo 8 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    const { error } = await signUp(email, password, name)
    setSubmitting(false)

    if (error) {
      toast({
        title: 'Erro ao cadastrar',
        description: error.message || 'Não foi possível criar a conta.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Seu acesso foi registrado.',
      })
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 mb-2">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Criar Nova Conta</h2>
          <p className="text-sm text-slate-400">
            Cadastre-se para gerenciar a conta corrente da diretoria
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-slate-300">
              Nome Completo
            </Label>
            <Input
              id="name"
              placeholder="Ex: Carlos Andrade"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">
              E-mail Institucional
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="carlos@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300">
              Senha (Mínimo 8 caracteres)
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-slate-300">
              Confirmar Senha
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-auto shadow-lg shadow-indigo-600/30 transition-all"
            disabled={submitting}
          >
            {submitting ? 'Criando Conta...' : 'Cadastrar e Acessar'}
            <UserPlus className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Já possui uma conta registrada?{' '}
            <Link to="/login" className="text-indigo-400 hover:underline font-semibold">
              Entrar na conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
