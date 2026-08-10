import { useState, useEffect, useMemo } from 'react'
import { getTransactions, Transaction } from '@/services/transactions'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Download, PieChart as PieIcon, BarChart2, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const COLOR_PALETTE = [
  '#6366f1',
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#dc2626',
  '#64748b',
]

export default function Graficos() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [period, setPeriod] = useState<'30' | '90' | '365' | 'all'>('all')

  useEffect(() => {
    getTransactions(undefined, 'date')
      .then(setTransactions)
      .catch(() => {})
  }, [])

  const filteredData = useMemo(() => {
    if (period === 'all') return transactions
    const days = parseInt(period, 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return transactions.filter((tx) => new Date(tx.date) >= cutoff)
  }, [transactions, period])

  // Area evolution
  const evolutionData = useMemo(() => {
    let running = 0
    const sorted = [...filteredData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
    return sorted.map((tx) => {
      if (tx.type === 'entrada') running += tx.amount
      else running -= tx.amount
      return {
        data: formatDate(tx.date),
        saldo: running,
      }
    })
  }, [filteredData])

  // Monthly Bar
  const monthlyData = useMemo(() => {
    const map: Record<string, { entrada: number; saida: number }> = {}
    filteredData.forEach((tx) => {
      const monthKey = new Date(tx.date).toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit',
      })
      if (!map[monthKey]) map[monthKey] = { entrada: 0, saida: 0 }
      if (tx.type === 'entrada') map[monthKey].entrada += tx.amount
      else map[monthKey].saida += tx.amount
    })
    return Object.entries(map).map(([mês, vals]) => ({
      mês,
      Entradas: vals.entrada,
      Saídas: vals.saida,
    }))
  }, [filteredData])

  // Expense Categories
  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {}
    filteredData.forEach((tx) => {
      if (tx.type === 'saida') {
        const cat = tx.category || 'Outros'
        map[cat] = (map[cat] || 0) + tx.amount
      }
    })
    const totalOut = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: totalOut > 0 ? (value / totalOut) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  const exportCSV = () => {
    const headers = 'ID,Data,Descrição,Tipo,Categoria,Valor\n'
    const rows = filteredData
      .map(
        (tx) =>
          `"${tx.id}","${tx.date}","${tx.description}","${tx.type}","${tx.category}",${tx.amount}`,
      )
      .join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `extrato_diretoria_${new Date().toISOString().substring(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Análise Gráfica da Diretoria
          </h1>
          <p className="text-sm text-slate-500">
            Visualização consolidada de métricas e distribuições.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Tabs value={period} onValueChange={(val: any) => setPeriod(val)}>
            <TabsList>
              <TabsTrigger value="30">30 dias</TabsTrigger>
              <TabsTrigger value="90">90 dias</TabsTrigger>
              <TabsTrigger value="365">12 meses</TabsTrigger>
              <TabsTrigger value="all">Total</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Balance Area Chart */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Evolução do Saldo de Conta Corrente
            </CardTitle>
            <CardDescription className="text-xs">
              Variação do patrimônio no período selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData}>
                <defs>
                  <linearGradient id="colorSaldoGraf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="data"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
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
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSaldoGraf)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Bar Chart */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-emerald-600" />
              Entradas vs. Saídas por Mês
            </CardTitle>
            <CardDescription className="text-xs">
              Comparativo direto de aportes e custos
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
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
                  tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Pie Chart */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-indigo-600" />
              Categorias de Saída
            </CardTitle>
            <CardDescription className="text-xs">Proporção das despesas</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryExpenses}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryExpenses.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#1e293b',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Expense Categories Breakdown */}
        <Card className="lg:col-span-2 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-bold">Ranking de Maiores Despesas</CardTitle>
            <CardDescription className="text-xs">
              Distribuição percentual por grupo de custos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryExpenses.length === 0 ? (
              <p className="text-sm text-slate-500">Sem saídas gravadas no período.</p>
            ) : (
              categoryExpenses.map((cat, idx) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200">{cat.name}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(cat.value)} ({cat.percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percent}%`,
                        backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
