import pb from '@/lib/pocketbase/client'

export interface Extrato {
  id: string
  user: string
  filename: string
  file?: string
  transactions_count: number
  project?: string
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

export interface ImportResult {
  success: boolean
  importedCount: number
  filename: string
  errors?: string[]
}

export const getExtratos = async (filter?: string): Promise<Extrato[]> => {
  return pb.collection('extratos').getFullList<Extrato>({
    sort: '-created',
    filter,
  })
}

export const deleteExtratoWithTransactions = async (
  extratoId: string,
  filename: string,
): Promise<void> => {
  const transactions = await pb.collection('transactions').getFullList({
    filter: `source_file = "${filename}"`,
  })
  for (const tx of transactions) {
    await pb.collection('transactions').delete(tx.id)
  }
  await pb.collection('extratos').delete(extratoId)
}

function readFileForUpload(
  file: File,
): Promise<{ content: string; isBase64: boolean; format: string }> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const binaryFormats = ['pdf', 'xlsx', 'xls']

    if (!binaryFormats.includes(ext)) {
      file
        .text()
        .then((text) => resolve({ content: text, isBase64: false, format: ext }))
        .catch(reject)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] || ''
        resolve({ content: base64, isBase64: true, format: ext })
      }
      reader.onerror = () => reject(new Error('Não foi possível ler o arquivo'))
      reader.readAsDataURL(file)
    }
  })
}

export const parseExtratoFile = async (
  file: File,
): Promise<{ filename: string; transactions: CandidateTransaction[] }> => {
  const { content, isBase64, format } = await readFileForUpload(file)
  const res = await pb.send('/backend/v1/extrato/parse', {
    method: 'POST',
    body: JSON.stringify({ content, filename: file.name, format, isBase64 }),
    headers: { 'Content-Type': 'application/json' },
  })
  return {
    filename: res?.filename || file.name,
    transactions: Array.isArray(res?.transactions) ? res.transactions : [],
  }
}

export const importExtratoTransactions = async (
  transactions: CandidateTransaction[],
  filename: string,
  projectId?: string,
): Promise<ImportResult> => {
  const res = await pb.send('/backend/v1/extrato/import', {
    method: 'POST',
    body: JSON.stringify({ transactions, filename, projectId }),
    headers: { 'Content-Type': 'application/json' },
  })
  return {
    success: res?.success ?? false,
    importedCount: res?.importedCount ?? 0,
    filename: res?.filename ?? filename,
    errors: Array.isArray(res?.errors) ? res.errors : undefined,
  }
}
