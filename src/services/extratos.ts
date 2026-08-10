import pb from '@/lib/pocketbase/client'

export interface Extrato {
  id: string
  user: string
  filename: string
  file?: string
  transactions_count: number
  created: string
  updated: string
}

export interface CandidateTransaction {
  description: string
  amount: number
  type: 'entrada' | 'saida'
  category: string
  date: string
}

export const getExtratos = async (): Promise<Extrato[]> => {
  return pb.collection('extratos').getFullList<Extrato>({
    sort: '-created',
  })
}

export const parseExtratoFile = async (
  content: string,
  filename: string,
): Promise<{ filename: string; transactions: CandidateTransaction[] }> => {
  return pb.send('/backend/v1/extrato/parse', {
    method: 'POST',
    body: JSON.stringify({ content, filename }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const importExtratoTransactions = async (
  transactions: CandidateTransaction[],
  filename: string,
): Promise<{ success: boolean; importedCount: number }> => {
  return pb.send('/backend/v1/extrato/import', {
    method: 'POST',
    body: JSON.stringify({ transactions, filename }),
    headers: { 'Content-Type': 'application/json' },
  })
}
