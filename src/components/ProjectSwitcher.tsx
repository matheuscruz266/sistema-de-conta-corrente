import { useState } from 'react'
import { useProjectStore } from '@/stores/use-project-store'
import { ProjectModal } from '@/components/ProjectModal'
import { Button } from '@/components/ui/button'
import { ChevronDown, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
import { Project } from '@/services/projects'

export function ProjectSwitcher() {
  const { projects, currentProject, setCurrentProjectId, deleteProject, loading } =
    useProjectStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  const handleNew = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = () => {
    setEditing(currentProject)
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!currentProject) return
    setDeleting(true)
    try {
      await deleteProject(currentProject.id)
      toast({
        title: 'Projeto excluído',
        description: 'Todos os dados associados foram removidos.',
      })
    } catch {
      toast({ title: 'Erro', description: 'Falha ao excluir projeto.', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 max-w-[200px]">
            {currentProject && (
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: currentProject.color || '#6366f1' }}
              />
            )}
            <span className="truncate">{currentProject?.name || 'Selecionar projeto'}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-slate-500">Projetos</DropdownMenuLabel>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => setCurrentProjectId(p.id)}
              className="gap-2 cursor-pointer"
            >
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: p.color || '#6366f1' }}
              />
              <span className="flex-1 truncate">{p.name}</span>
              {currentProject?.id === p.id && (
                <span className="text-xs text-indigo-600 font-bold">✓</span>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleNew} className="gap-2 cursor-pointer text-indigo-600">
            <Plus className="h-4 w-4" /> Novo Projeto
          </DropdownMenuItem>
          {currentProject && (
            <>
              <DropdownMenuItem onClick={handleEdit} className="gap-2 cursor-pointer">
                <Edit className="h-4 w-4" /> Editar Projeto
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="gap-2 cursor-pointer text-rose-600"
              >
                <Trash2 className="h-4 w-4" /> Excluir Projeto
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        projectToEdit={editing}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir projeto "{currentProject?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as movimentações, categorias e extratos associados a este projeto serão
              permanentemente removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? 'Excluindo...' : 'Excluir Projeto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
