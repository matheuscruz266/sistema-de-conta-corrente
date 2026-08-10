import { useMemo } from 'react'
import { useProjectStore } from '@/stores/use-project-store'

export function usePermissions() {
  const { currentProject } = useProjectStore()

  return useMemo(() => {
    const isOwner = currentProject?.isOwner ?? false
    const role = currentProject?.role
    const isAdmin = isOwner || role === 'administrador'
    const isLancador = role === 'lancador'
    const canManageMembers = isAdmin
    const canManageProject = isAdmin

    return { isOwner, isAdmin, isLancador, canManageMembers, canManageProject, role }
  }, [currentProject?.id, currentProject?.isOwner, currentProject?.role])
}
