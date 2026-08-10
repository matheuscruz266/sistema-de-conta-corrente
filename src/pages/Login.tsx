import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet, ArrowRight, ShieldCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    setSubmitting(true)
    const { error } = await signIn(email, password)
    setSubmitting(false)

    if (error) {
      toast({
        title: 'Erro de Autenticação',
        description: 'E-mail ou senha incorretos. Verifique suas credenciais.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Acesso Autorizado',
        description: 'Bem-vindo ao Sistema de Conta Corrente da Diretoria.',
      })
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 animate-fade-in-up">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 mb-2">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Acesso Diretoria</h2>
          <p className="text-sm text-slate-400">Sistema de Gestão de Conta Corrente e Extratos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">
              E-mail Institucional
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="diretoria@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-slate-300">
                Senha
              </Label>
            </div>
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

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 h-auto shadow-lg shadow-indigo-600/30 transition-all"
            disabled={submitting}
          >
            {submitting ? 'Verificando...' : 'Entrar na Conta'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-400">
            Não tem uma conta cadastrada?{' '}
            <Link to="/signup" className="text-indigo-400 hover:underline font-semibold">
              Cadastre-se
            </Link>
          </p>

          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Ambiente seguro e criptografado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
