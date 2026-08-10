import { useState, useEffect, useMemo } from 'react'
import { getTransactions, deleteTransaction, Transaction } from '@/services/transactions'
import { getCategories, Category } from '@/services/categories'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import { TransactionModal } from '@/components/TransactionModal'
import { Search, Filter, Plus, Trash2, Edit, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function Movimentacoes() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [txs, cats] = await Promise.all([getTransactions(undefined, '-date'), getCategories()])
      setTransactions(txs)
      setCategories(cats)
    } catch {
      // Handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('transactions', () => {
    loadData()
  })

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase())
      const matchCat = selectedCategory === 'all' || tx.category === selectedCategory
      const matchType = selectedType === 'all' || tx.type === selectedType
      return matchSearch && matchCat && matchType
    })
  }, [transactions, search, selectedCategory, selectedType])

  const totals = useMemo(() => {
    let inSum = 0
    let outSum = 0
    filteredTransactions.forEach((tx) => {
      if (tx.type === 'entrada') inSum += tx.amount
      else outSum += tx.amount
    })
    return { inSum, outSum, net: inSum - outSum }
  }, [filteredTransactions])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta movimentação?')) return
    try {
      await deleteTransaction(id)
      toast({ title: 'Excluído', description: 'Movimentação removida da conta corrente.' })
      loadData()
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o lançamento.',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setEditingTransaction(null)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Lançamentos da Conta Corrente
          </h1>
          <p className="text-sm text-slate-500">Gestão detalhada de todas as entradas e saídas.</p>
        </div>
        <Button onClick={handleNew} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Nova Movimentação
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          <div className="w-full md:w-48">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <Filter className="h-3.5 w-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-40">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="saida">Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Filtered Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Entradas Filtradas</span>
          <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
            <ArrowUpRight className="h-4 w-4" /> {formatCurrency(totals.inSum)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Saídas Filtradas</span>
          <span className="text-sm font-bold text-rose-600 flex items-center gap-1">
            <ArrowDownRight className="h-4 w-4" /> {formatCurrency(totals.outSum)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">Resultado do Filtro</span>
          <span
            className={`text-sm font-bold ${totals.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}
          >
            {formatCurrency(totals.net)}
          </span>
        </div>
      </div>

      {/* Main Transactions Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando movimentações...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhum lançamento encontrado com os filtros aplicados.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">Data</th>
                  <th className="px-6 py-3 font-semibold">Descrição</th>
                  <th className="px-6 py-3 font-semibold">Categoria</th>
                  <th className="px-6 py-3 font-semibold">Tipo</th>
                  <th className="px-6 py-3 font-semibold text-right">Valor</th>
                  <th className="px-6 py-3 font-semibold text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-medium whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      {tx.description}
                      {tx.source_file && (
                        <p className="text-[10px] text-indigo-500 font-normal">
                          Origem: {tx.source_file}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {tx.category || 'Outros'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge
                        variant="secondary"
                        className={
                          tx.type === 'entrada'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 font-semibold'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-semibold'
                        }
                      >
                        {tx.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </td>
                    <td
                      className={`px-6 py-3.5 text-right font-bold whitespace-nowrap ${
                        tx.type === 'entrada'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.type === 'entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-indigo-600"
                          onClick={() => handleEdit(tx)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-rose-600"
                          onClick={() => handleDelete(tx.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transactionToEdit={editingTransaction}
        onSuccess={loadData}
      />
    </div>
  )
}
