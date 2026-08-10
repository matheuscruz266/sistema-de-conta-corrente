import { useState, useEffect } from 'react'
import { getCategories, createCategory, deleteCategory, Category } from '@/services/categories'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Plus, Trash2, Tag, ShieldCheck, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useProjectStore } from '@/stores/use-project-store'
import { ProjectMembers } from '@/components/ProjectMembers'

export default function Configuracoes() {
  const { user } = useAuth()
  const { currentProject } = useProjectStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const loadCategories = async () => {
    if (!currentProject) {
      setCategories([])
      return
    }
    try {
      const list = await getCategories(`project = "${currentProject.id}"`)
      setCategories(list)
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    loadCategories()
  }, [currentProject?.id])

  useRealtime('categories', () => {
    loadCategories()
  })

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return

    setSubmitting(true)
    try {
      await createCategory({ name: newCatName.trim(), project: currentProject?.id })
      toast({
        title: 'Categoria criada',
        description: `A categoria "${newCatName}" foi adicionada.`,
      })
      setNewCatName('')
      loadCategories()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao criar categoria.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = (cat: Category) => {
    setDeleteTarget(cat)
  }

  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCategory(deleteTarget.id)
      toast({ title: 'Categoria removida', description: `"${deleteTarget.name}" foi excluída.` })
      setDeleteTarget(null)
      loadCategories()
    } catch {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a categoria. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Configurações do Sistema
        </h1>
        <p className="text-sm text-slate-500">
          Gerenciamento de categorias, perfil da diretoria e preferências.
        </p>
      </div>

      {/* User Profile Info */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-600" />
            Perfil da Diretoria
          </CardTitle>
          <CardDescription className="text-xs">Informações da conta conectada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Nome Cadastrado</Label>
              <Input value={user?.name || ''} readOnly className="bg-slate-50 dark:bg-slate-900" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">E-mail Institucional</Label>
              <Input value={user?.email || ''} readOnly className="bg-slate-50 dark:bg-slate-900" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-600" />
            Categorias de Movimentação
          </CardTitle>
          <CardDescription className="text-xs">
            Crie e organize os marcadores usados nos lançamentos de entrada e saída.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input
              placeholder="Nome da nova categoria..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {cat.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteCategory(cat)}
                  className="h-7 w-7 text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Members Management */}
      <ProjectMembers />

      {/* Security notice */}
      <Card className="border-indigo-100 bg-indigo-50/40 dark:bg-indigo-950/20 dark:border-indigo-900">
        <CardContent className="p-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0" />
          <div className="text-xs text-indigo-950 dark:text-indigo-200">
            <p className="font-semibold">Segurança e Privacidade</p>
            <p>
              Todos os lançamentos e extratos são restritos exclusivamente ao seu usuário
              autenticado.
            </p>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  Tem certeza que deseja excluir a categoria <strong>"{deleteTarget.name}"</strong>?
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
