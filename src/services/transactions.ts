import pb from '@/lib/pocketbase/client'

export interface Transaction {
  id: string
  user: string
  description: string
  amount: number
  type: 'entrada' | 'saida'
  category: string
  date: string
  source_file?: string
  project?: string
  created: string
  updated: string
}

export const getTransactions = async (filter?: string, sort = '-date'): Promise<Transaction[]> => {
  return pb.collection('transactions').getFullList<Transaction>({
    filter,
    sort,
  })
}

export const createTransaction = async (
  data: Omit<Transaction, 'id' | 'created' | 'updated'>,
): Promise<Transaction> => {
  return pb.collection('transactions').create<Transaction>(data)
}

export const updateTransaction = async (
  id: string,
  data: Partial<Omit<Transaction, 'id' | 'created' | 'updated'>>,
): Promise<Transaction> => {
  return pb.collection('transactions').update<Transaction>(id, data)
}

export const deleteTransaction = async (id: string): Promise<boolean> => {
  return pb.collection('transactions').delete(id)
}
