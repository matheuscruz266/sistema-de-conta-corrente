import pb from '@/lib/pocketbase/client'

export interface Project {
  id: string
  user: string
  name: string
  description?: string
  color?: string
  created: string
  updated: string
}

export const getProjects = async (): Promise<Project[]> => {
  return pb.collection('projects').getFullList<Project>({
    sort: 'name',
  })
}

export const getProject = async (id: string): Promise<Project> => {
  return pb.collection('projects').getOne<Project>(id)
}

export const createProject = async (data: {
  name: string
  description?: string
  color?: string
}): Promise<Project> => {
  const userId = pb.authStore.record?.id
  return pb.collection('projects').create<Project>({
    ...data,
    user: userId,
  })
}

export const updateProject = async (
  id: string,
  data: Partial<{ name: string; description: string; color: string }>,
): Promise<Project> => {
  return pb.collection('projects').update<Project>(id, data)
}

export const deleteProject = async (id: string): Promise<boolean> => {
  return pb.collection('projects').delete(id)
}
