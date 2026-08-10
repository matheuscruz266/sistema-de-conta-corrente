import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  getProjects,
  createProject as svcCreate,
  updateProject as svcUpdate,
  deleteProject as svcDelete,
  Project,
} from '@/services/projects'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

interface ProjectStoreType {
  projects: Project[]
  currentProject: Project | null
  setCurrentProjectId: (id: string) => void
  createProject: (data: { name: string; description?: string; color?: string }) => Promise<void>
  updateProject: (
    id: string,
    data: Partial<{ name: string; description: string; color: string }>,
  ) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  loading: boolean
}

const ProjectContext = createContext<ProjectStoreType | undefined>(undefined)

export function useProjectStore() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjectStore must be used within a ProjectProvider')
  return ctx
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() =>
    localStorage.getItem('currentProjectId'),
  )
  const [loading, setLoading] = useState(true)

  const loadProjects = useCallback(async () => {
    try {
      const list = await getProjects()
      setProjects(list)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (isAuthenticated) {
      loadProjects()
    } else {
      setProjects([])
      setLoading(false)
    }
  }, [isAuthenticated, authLoading, loadProjects])

  useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.id === currentProjectId)) {
      const newId = projects[0].id
      setCurrentProjectId(newId)
      localStorage.setItem('currentProjectId', newId)
    } else if (projects.length === 0 && currentProjectId) {
      setCurrentProjectId(null)
      localStorage.removeItem('currentProjectId')
    }
  }, [projects, currentProjectId])

  useRealtime(
    'projects',
    () => {
      if (isAuthenticated) loadProjects()
    },
    isAuthenticated,
  )

  const handleSetCurrent = (id: string) => {
    setCurrentProjectId(id)
    localStorage.setItem('currentProjectId', id)
  }

  const handleCreate = async (data: { name: string; description?: string; color?: string }) => {
    const project = await svcCreate(data)
    await loadProjects()
    handleSetCurrent(project.id)
  }

  const handleUpdate = async (
    id: string,
    data: Partial<{ name: string; description: string; color: string }>,
  ) => {
    await svcUpdate(id, data)
    await loadProjects()
  }

  const handleDelete = async (id: string) => {
    const collections = ['transactions', 'categories', 'extratos']
    for (const col of collections) {
      const records = await pb.collection(col).getFullList({ filter: `project = "${id}"` })
      for (const r of records) {
        await pb.collection(col).delete(r.id)
      }
    }
    await svcDelete(id)
    await loadProjects()
  }

  const currentProject = projects.find((p) => p.id === currentProjectId) || null

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        setCurrentProjectId: handleSetCurrent,
        createProject: handleCreate,
        updateProject: handleUpdate,
        deleteProject: handleDelete,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
