import { useState, useEffect } from 'react'
import {
  parseExtratoFile,
  importExtratoTransactions,
  getExtratos,
  Extrato,
  CandidateTransaction,
} from '@/services/extratos'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import {
  FileUp,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function Extratos() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [candidates, setCandidateTransactions] = useState<CandidateTransaction[]>([])
  const [extratosHistory, setExtratosHistory] = useState<Extrato[]>([])
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O tamanho máximo suportado é 10MB.',
          variant: 'destructive',
        })
        return
      }
      setSelectedFile(file)
    }
  }

  const handleProcessFile = async () => {
    if (!selectedFile) return

    setParsing(true)
    try {
      const text = await selectedFile.text()
      const res = await parseExtratoFile(text, selectedFile.name)
      setCandidateTransactions(res.transactions || [])

      if (!res.transactions || res.transactions.length === 0) {
        toast({
          title: 'Aviso',
          description:
            'Não foram encontradas movimentações claras no arquivo. Tente um formato mais limpo.',
        })
      } else {
        toast({
          title: 'Extrato Analisado',
          description: `Extraídas ${res.transactions.length} movimentações para confirmação.`,
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao processar',
        description: err.message || 'Falha ao ler o extrato bancário.',
        variant: 'destructive',
      })
    } finally {
      setParsing(false)
    }
  }

  const handleSaveImport = async () => {
    if (candidates.length === 0 || !selectedFile) return

    setImporting(true)
    try {
      await importExtratoTransactions(candidates, selectedFile.name)
      toast({
        title: 'Movimentações Salvas',
        description: `${candidates.length} lançamentos foram adicionados à conta corrente.`,
      })
      setCandidateTransactions([])
      setSelectedFile(null)
      loadHistory()
    } catch (err: any) {
      toast({
        title: 'Erro na Importação',
        description: err.message || 'Falha ao gravar os lançamentos.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
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
      {/* Upload Zone Section */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
            Importar Extrato Bancário
          </CardTitle>
          <CardDescription className="text-xs">
            Envie extratos em PDF, TXT, CSV ou OFX para processamento e geração da conta corrente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all relative">
            <input
              type="file"
              accept=".pdf,.csv,.txt,.ofx,.xlsx"
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
                  Suporta arquivos .PDF, .TXT, .CSV, .OFX de até 10MB
                </p>
              </div>
            </div>
          </div>

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
        </CardContent>
      </Card>

      {/* Candidate Preview Table */}
      {candidates.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                Pré-visualização dos Lançamentos Identificados ({candidates.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Revise os dados antes de gravar definitivamente na conta corrente da diretoria.
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
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Confirmar e Salvar Movimentações'
                )}
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
                        className="h-8 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2"
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

      {/* History of Processed Statements */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Histórico de Extratos Processados</CardTitle>
            <CardDescription className="text-xs">
              Lista de arquivos importados anteriormente no sistema
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
                  <th className="px-6 py-3 font-semibold">Data do Envio</th>
                  <th className="px-6 py-3 font-semibold">Nome do Arquivo</th>
                  <th className="px-6 py-3 font-semibold text-right">Lançamentos Gerados</th>
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
                    <td className="px-6 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 font-bold">
                        {ext.transactions_count} itens
                      </Badge>
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
