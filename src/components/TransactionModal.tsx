import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTransaction, updateTransaction, Transaction } from '@/services/transactions'
import { getCategories, Category } from '@/services/categories'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useProjectStore } from '@/stores/use-project-store'

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transactionToEdit?: Transaction | null
  onSuccess: () => void
}

export function TransactionModal({
  isOpen,
  onClose,
  transactionToEdit,
  onSuccess,
}: TransactionModalProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'entrada' | 'saida'>('saida')
  const [category, setCategory] = useState('Outros')
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()
  const { currentProject } = useProjectStore()

  useEffect(() => {
    if (isOpen) {
      const catFilter = currentProject ? `project = "${currentProject.id}"` : ''
      getCategories(catFilter)
        .then(setCategories)
        .catch(() => {})
      if (transactionToEdit) {
        setDescription(transactionToEdit.description)
        setAmount(transactionToEdit.amount.toString())
        setType(transactionToEdit.type)
        setCategory(transactionToEdit.category || 'Outros')
        setDate(transactionToEdit.date.substring(0, 10))
      } else {
        setDescription('')
        setAmount('')
        setType('saida')
        setCategory('Outros')
        setDate(new Date().toISOString().substring(0, 10))
      }
    }
  }, [isOpen, transactionToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Erro de validação',
        description: 'Preencha a descrição e um valor maior que zero.',
        variant: 'destructive',
      })
      return
    }

    const userId = pb.authStore.record?.id
    if (!userId) return

    setSubmitting(true)
    try {
      const payload = {
        user: userId,
        description,
        amount: Math.abs(parseFloat(amount)),
        type,
        category,
        date: new Date(date).toISOString(),
        project: currentProject?.id,
      }

      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, payload)
        toast({ title: 'Sucesso', description: 'Movimentação atualizada com sucesso!' })
      } else {
        await createTransaction(payload)
        toast({ title: 'Sucesso', description: 'Nova movimentação criada com sucesso!' })
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao salvar movimentação.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {transactionToEdit ? 'Editar Movimentação' : 'Nova Movimentação'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="Ex: Repasse de Honorários"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(val: 'entrada' | 'saida') => setType(val)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Receita)</SelectItem>
                  <SelectItem value="saida">Saída (Despesa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Outros">Outros</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
