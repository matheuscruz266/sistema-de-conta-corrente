import pb from '@/lib/pocketbase/client'

export interface ProjectMember {
  id: string
  userId: string
  userName: string
  userEmail: string
  role: 'lancador' | 'administrador'
  isOwner: boolean
}

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  return pb.send(`/backend/v1/project-members/${projectId}`, { method: 'GET' })
}

export const addProjectMember = async (
  projectId: string,
  email: string,
  role: 'lancador' | 'administrador',
): Promise<ProjectMember> => {
  return pb.send('/backend/v1/project-members/add', {
    method: 'POST',
    body: JSON.stringify({ projectId, email, role }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const removeProjectMember = async (memberId: string): Promise<void> => {
  await pb.send(`/backend/v1/project-members/${memberId}`, { method: 'DELETE' })
}
