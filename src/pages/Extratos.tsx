import { useState, useEffect } from 'react'
import {
  parseExtratoFile,
  importExtratoTransactions,
  getExtratos,
  deleteExtratoWithTransactions,
  type Extrato,
  type CandidateTransaction,
  type ImportResult,
} from '@/services/extratos'
import { formatDateTime } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import {
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function Extratos() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [candidates, setCandidateTransactions] = useState<CandidateTransaction[]>([])
  const [extratosHistory, setExtratosHistory] = useState<Extrato[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadHistory = async () => {
    try {
      const list = await getExtratos()
      setExtratosHistory(list)
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useRealtime('extratos', () => {
    loadHistory()
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        setParseError('O tamanho máximo suportado é 10MB.')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleProcessFile = async () => {
    if (!selectedFile) return

    setParseError(null)
    setParsing(true)
    try {
      const res = await parseExtratoFile(selectedFile)
      if (!res.transactions || res.transactions.length === 0) {
        setParseError(
          'Nenhuma transação identificada no arquivo. Verifique se o conteúdo é um extrato bancário válido.',
        )
      } else {
        setCandidateTransactions(res.transactions)
        toast({
          title: 'Extrato Analisado',
          description: `Extraídas ${res.transactions.length} movimentações para confirmação.`,
        })
      }
    } catch (err: any) {
      const message =
        getErrorMessage(err) ||
        'Falha ao processar o extrato bancário. Verifique o formato do arquivo.'
      setParseError(message)
    } finally {
      setParsing(false)
    }
  }

  const handleSaveImport = async () => {
    if (candidates.length === 0 || !selectedFile) return

    setImporting(true)
    setImportErrors([])
    try {
      const result: ImportResult = await importExtratoTransactions(candidates, selectedFile.name)
      if (!result.success && result.importedCount === 0) {
        setParseError(
          'Nenhuma movimentação pôde ser importada. Verifique os dados e tente novamente.',
        )
        return
      }
      toast({
        title: 'Movimentações Salvas',
        description: `${result.importedCount} lançamentos foram adicionados à conta corrente.`,
      })
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors)
        toast({
          title: 'Avisos de Importação',
          description: `${result.errors.length} linha(s) com problema foram puladas.`,
          variant: 'destructive',
        })
      }
      setCandidateTransactions([])
      setSelectedFile(null)
      loadHistory()
    } catch (err: any) {
      const message = getErrorMessage(err) || 'Falha ao gravar os lançamentos.'
      setParseError(message)
    } finally {
      setImporting(false)
    }
  }

  const handleDeleteExtrato = async (extrato: Extrato) => {
    setDeletingId(extrato.id)
    try {
      await deleteExtratoWithTransactions(extrato.id, extrato.filename)
      toast({
        title: 'Extrato excluído',
        description: 'O registro e suas movimentações foram removidos.',
      })
      loadHistory()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao excluir o extrato.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const updateCandidate = (index: number, field: keyof CandidateTransaction, value: any) => {
    setCandidateTransactions((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const removeCandidate = (index: number) => {
    setCandidateTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {(parsing || importing) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-xl">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {parsing ? 'Analisando extrato...' : 'Salvando movimentações...'}
            </p>
            <p className="text-xs text-slate-500">Isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            Importar Extrato Bancário
          </CardTitle>
          <CardDescription className="text-xs">
            Envie extratos em PDF, OFX, Excel, CSV ou TXT para processamento e geração da conta
            corrente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all relative">
            <input
              type="file"
              accept=".pdf,.csv,.txt,.ofx,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
                <FileUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile
                    ? selectedFile.name
                    : 'Arraste seu arquivo de extrato aqui ou clique para selecionar'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Suporta PDF, OFX, Excel (XLSX), CSV e TXT de até 10MB
                </p>
              </div>
            </div>
          </div>

          {parseError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-lg border border-red-200 dark:border-red-900">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {selectedFile && (
            <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                onClick={handleProcessFile}
                disabled={parsing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando Extrato...
                  </>
                ) : (
                  <>
                    Analisar & Extrair Dados
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="font-semibold mb-1">Avisos durante a importação:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {candidates.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                Pré-visualização dos Lançamentos ({candidates.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Revise os dados antes de gravar na conta corrente.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCandidateTransactions([])}>
                Descartar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveImport}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar e Salvar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Categoria</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Valor (R$)</th>
                  <th className="px-4 py-3 font-semibold text-center">Remover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {candidates.map((cand, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-4 py-2">
                      <Input
                        type="date"
                        value={cand.date ? cand.date.substring(0, 10) : ''}
                        onChange={(e) => updateCandidate(idx, 'date', e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={cand.description}
                        onChange={(e) => updateCandidate(idx, 'description', e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-950 min-w-[200px]"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={cand.category}
                        onChange={(e) => updateCandidate(idx, 'category', e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={cand.type}
                        onChange={(e) => updateCandidate(idx, 'type', e.target.value)}
                        className={cn(
                          'h-8 text-xs rounded-md border px-2 font-medium',
                          cand.type === 'entrada'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950'
                            : 'border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:bg-rose-950',
                        )}
                      >
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={cand.amount}
                        onChange={(e) =>
                          updateCandidate(idx, 'amount', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs bg-white dark:bg-slate-950 w-28 font-bold"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCandidate(idx)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Histórico de Extratos</CardTitle>
            <CardDescription className="text-xs">
              Arquivos importados anteriormente. Exclua um registro para reimportar o mesmo arquivo.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadHistory} className="gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {extratosHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhum extrato registrado no histórico.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">Data</th>
                  <th className="px-6 py-3 font-semibold">Arquivo</th>
                  <th className="px-6 py-3 font-semibold text-right">Lançamentos</th>
                  <th className="px-6 py-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {extratosHistory.map((ext) => (
                  <tr key={ext.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {formatDateTime(ext.created)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
                      {ext.filename}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold">
                        {ext.transactions_count} itens
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={deletingId === ext.id}
                            className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            {deletingId === ext.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir extrato?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá o registro de "{ext.filename}" e todas as{' '}
                              {ext.transactions_count} movimentações associadas. Esta ação não pode
                              ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteExtrato(ext)}
                              className="bg-rose-600 hover:bg-rose-700 text-white"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
