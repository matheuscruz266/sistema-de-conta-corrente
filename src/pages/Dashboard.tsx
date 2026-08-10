import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getTransactions, Transaction } from '@/services/transactions'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { useRealtime } from '@/hooks/use-realtime'
import {
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  FileText,
  Activity,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useProjectStore } from '@/stores/use-project-store'
import { exportDashboardAsPNG } from '@/lib/export-dashboard'
import { useToast } from '@/hooks/use-toast'
import { Download, Loader2 } from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts'

const CHART_COLORS = [
  '#6366f1',
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#dc2626',
  '#64748b',
]

export default function Dashboard() {
  const { currentProject } = useProjectStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const loadData = async () => {
    if (!currentProject) {
      setTransactions([])
      setLoading(false)
      return
    }
    try {
      const filter = `project = "${currentProject.id}"`
      const data = await getTransactions(filter, 'date')
      setTransactions(Array.isArray(data) ? data : [])
    } catch {
      // Handled
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentProject?.id])

  useRealtime('transactions', () => {
    loadData()
  })

  // Computed Metrics
  const {
    totalIn,
    totalOut,
    currentBalance,
    recentTransactions,
    balanceEvolution,
    monthlyData,
    categoryDistribution,
  } = useMemo(() => {
    let inSum = 0
    let outSum = 0

    transactions.forEach((tx) => {
      if (tx.type === 'entrada') inSum += tx.amount
      else outSum += tx.amount
    })

    const balance = inSum - outSum

    // Evolution area chart calculation
    let runningBalance = 0
    const sortedAsc = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    const evolution = sortedAsc.map((tx) => {
      if (tx.type === 'entrada') runningBalance += tx.amount
      else runningBalance -= tx.amount
      return {
        date: formatDate(tx.date),
        saldo: runningBalance,
      }
    })

    // Monthly Bar Chart Calculation
    const monthlyMap: Record<string, { entrada: number; saida: number }> = {}
    transactions.forEach((tx) => {
      const monthKey = new Date(tx.date).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      })
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { entrada: 0, saida: 0 }
      if (tx.type === 'entrada') monthlyMap[monthKey].entrada += tx.amount
      else monthlyMap[monthKey].saida += tx.amount
    })

    const monthlyArr = Object.entries(monthlyMap).map(([month, vals]) => ({
      mês: month,
      Entradas: vals.entrada,
      Saídas: vals.saida,
    }))

    // Category Distribution (Outflows)
    const categoryMap: Record<string, number> = {}
    transactions.forEach((tx) => {
      if (tx.type === 'saida') {
        const cat = tx.category || 'Outros'
        categoryMap[cat] = (categoryMap[cat] || 0) + tx.amount
      }
    })

    const categoryArr = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }))

    const sortedDesc = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )

    return {
      totalIn: inSum,
      totalOut: outSum,
      currentBalance: balance,
      recentTransactions: sortedDesc.slice(0, 6),
      balanceEvolution: evolution,
      monthlyData: monthlyArr,
      categoryDistribution: categoryArr,
    }
  }, [transactions])

  const handleExport = async () => {
    if (!dashboardRef.current || !currentProject) return
    setExporting(true)
    try {
      await exportDashboardAsPNG(
        dashboardRef.current,
        currentProject.name,
        formatDate(new Date().toISOString()),
        [
          { label: 'Saldo Atual', value: formatCurrency(currentBalance), color: '#6366f1' },
          { label: 'Entradas', value: formatCurrency(totalIn), color: '#10b981' },
          { label: 'Saídas', value: formatCurrency(totalOut), color: '#ef4444' },
          { label: 'Movimentações', value: String(transactions.length), color: '#64748b' },
        ],
      )
    } catch (err: any) {
      toast({
        title: 'Erro na exportação',
        description: err?.message || 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={dashboardRef} className="space-y-6 animate-fade-in">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Resumo Financeiro da Diretoria
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhamento consolidado do fluxo de caixa e conta corrente.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link to="/extratos" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Importar Extrato
            </Button>
          </Link>
          <Link to="/movimentacoes" className="w-full sm:w-auto">
            <Button className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <PlusCircle className="h-4 w-4" />
              Nova Lançamento
            </Button>
          </Link>
          <Button
            onClick={handleExport}
            disabled={exporting || transactions.length === 0}
            variant="outline"
            className="w-full sm:w-auto gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exporting ? 'Exportando...' : 'Exportar'}
          </Button>
        </div>
      </div>

      {/* Balance Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Balance */}
        <Card className="border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-indigo-100 tracking-wider uppercase">
              Saldo Atual
            </CardTitle>
            <Scale className="h-5 w-5 text-indigo-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black tracking-tight">
              {formatCurrency(currentBalance)}
            </div>
            <p className="text-[11px] text-indigo-200 mt-1 font-medium">
              Balanço líquido acumulado
            </p>
          </CardContent>
        </Card>

        {/* Total Inflows */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
              Entradas (Receitas)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatCurrency(totalIn)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" /> Total de repasses e aportes
            </p>
          </CardContent>
        </Card>

        {/* Total Outflows */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
              Saídas (Despesas)
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatCurrency(totalOut)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-rose-500" /> Honorários, serviços e custos
            </p>
          </CardContent>
        </Card>

        {/* Total Count */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
              Movimentações
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {transactions.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Registros processados no sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Evolution */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">Evolução do Saldo Acumulado</CardTitle>
            <CardDescription className="text-xs">
              Progressão da conta corrente após cada lançamento
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceEvolution}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), 'Saldo']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSaldo)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Category Pie */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">Despesas por Categoria</CardTitle>
            <CardDescription className="text-xs">
              Distribuição das saídas de recursos
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex flex-col items-center justify-center">
            {categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">Nenhuma despesa registrada.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), 'Total']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Entradas vs Saidas */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-bold">Entradas vs. Saídas por Mês</CardTitle>
          <CardDescription className="text-xs">
            Comparativo de fluxo de caixa mensal
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="mês"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: number) => formatCurrency(val)}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Transactions Table */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Movimentações Recentes</CardTitle>
            <CardDescription className="text-xs">
              Últimos lançamentos na conta corrente
            </CardDescription>
          </div>
          <Link to="/movimentacoes">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Ver Todas →
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma movimentação registrada até o momento.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-6 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-medium whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      {tx.description}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
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
