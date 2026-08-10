import pb from '@/lib/pocketbase/client'

export interface Category {
  id: string
  user: string
  name: string
  color?: string
  icon?: string
  created: string
  updated: string
}

export const getCategories = async (): Promise<Category[]> => {
  return pb.collection('categories').getFullList<Category>({
    sort: 'name',
  })
}

export const createCategory = async (data: {
  name: string
  color?: string
  icon?: string
}): Promise<Category> => {
  const userId = pb.authStore.record?.id
  return pb.collection('categories').create<Category>({
    ...data,
    user: userId,
  })
}

export const deleteCategory = async (id: string): Promise<boolean> => {
  return pb.collection('categories').delete(id)
}
