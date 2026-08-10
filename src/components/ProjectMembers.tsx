import { useState, useEffect } from 'react'
import {
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  type ProjectMember,
} from '@/services/project-members'
import { useProjectStore } from '@/stores/use-project-store'
import { useRealtime } from '@/hooks/use-realtime'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserPlus, Trash2, Users, Crown } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  lancador: 'Lançador',
  administrador: 'Administrador',
}

export function ProjectMembers() {
  const { currentProject } = useProjectStore()
  const { canManageMembers } = usePermissions()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'lancador' | 'administrador'>('lancador')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ProjectMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()

  const loadMembers = async () => {
    if (!currentProject) {
      setMembers([])
      return
    }
    try {
      const list = await getProjectMembers(currentProject.id)
      setMembers(list)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    loadMembers()
  }, [currentProject?.id])

  useRealtime('project_members', () => {
    loadMembers()
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !currentProject) return
    setSubmitting(true)
    setFieldErrors({})
    try {
      await addProjectMember(currentProject.id, email.trim(), role)
      toast({
        title: 'Membro adicionado',
        description: `${email} foi adicionado ao projeto.`,
      })
      setEmail('')
      setRole('lancador')
      loadMembers()
    } catch (err) {
      const errors = extractFieldErrors(err)
      setFieldErrors(errors)
      if (Object.keys(errors).length === 0) {
        toast({
          title: 'Erro',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const confirmRemove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await removeProjectMember(deleteTarget.id)
      toast({
        title: 'Membro removido',
        description: `${deleteTarget.userName || deleteTarget.userEmail} foi removido do projeto.`,
      })
      setDeleteTarget(null)
      loadMembers()
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao remover membro. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!canManageMembers) return null

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Membros do Projeto
          </CardTitle>
          <CardDescription className="text-xs">
            Gerencie quem tem acesso ao projeto e suas permissões.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="member-email" className="text-xs text-slate-500">
                  E-mail da pessoa
                </Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="pessoa@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldErrors.email ? 'border-rose-400' : ''}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Função</Label>
                <Select
                  value={role}
                  onValueChange={(v: 'lancador' | 'administrador') => setRole(v)}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lancador">Lançador</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <UserPlus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
            {fieldErrors.email && <p className="text-sm text-rose-500">{fieldErrors.email}</p>}
          </form>

          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {m.isOwner && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {m.userName || m.userEmail}
                    </p>
                    {m.userName && <p className="text-xs text-slate-500 truncate">{m.userEmail}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="secondary"
                    className={
                      m.role === 'administrador'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }
                  >
                    {ROLE_LABELS[m.role] || m.role}
                  </Badge>
                  {!m.isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(m)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Tem certeza que deseja remover{' '}
                  <strong>{deleteTarget.userName || deleteTarget.userEmail}</strong> do projeto?
                  Esta pessoa perderá acesso imediatamente.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
