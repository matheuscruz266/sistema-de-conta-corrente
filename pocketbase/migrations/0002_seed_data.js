migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'tiago@julitago.com.br')
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('tiago@julitago.com.br')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Tiago Diretoria')
      app.save(userRecord)
    }

    const userId = userRecord.id

    const categoriesCol = app.findCollectionByNameOrId('categories')
    const defaultCats = [
      { name: 'Receita Diretoria', color: '#10b981', icon: 'TrendingUp' },
      { name: 'Aporte Financeiro', color: '#3b82f6', icon: 'DollarSign' },
      { name: 'Honorários Diretoria', color: '#ef4444', icon: 'Briefcase' },
      { name: 'Serviços Terceirizados', color: '#8b5cf6', icon: 'Users' },
      { name: 'Despesas Operacionais', color: '#f59e0b', icon: 'Cpu' },
      { name: 'Aluguel & Infraestrutura', color: '#ec4899', icon: 'Building' },
      { name: 'Impostos & Taxas', color: '#dc2626', icon: 'FileText' },
      { name: 'Outros', color: '#64748b', icon: 'MoreHorizontal' },
    ]

    for (let i = 0; i < defaultCats.length; i++) {
      const catData = defaultCats[i]
      try {
        app.findFirstRecordByData('categories', 'name', catData.name)
      } catch (_) {
        const rec = new Record(categoriesCol)
        rec.set('user', userId)
        rec.set('name', catData.name)
        rec.set('color', catData.color)
        rec.set('icon', catData.icon)
        app.save(rec)
      }
    }

    const txCol = app.findCollectionByNameOrId('transactions')
    const sampleTxs = [
      {
        description: 'Aporte Inicial de Capital Diretoria',
        amount: 150000.0,
        type: 'entrada',
        category: 'Aporte Financeiro',
        date: '2026-05-02 10:00:00.000Z',
      },
      {
        description: 'Rendimento de Aplicações Financeiras',
        amount: 18500.0,
        type: 'entrada',
        category: 'Receita Diretoria',
        date: '2026-05-15 14:30:00.000Z',
      },
      {
        description: 'Honorários da Diretoria Executiva',
        amount: 35000.0,
        type: 'saida',
        category: 'Honorários Diretoria',
        date: '2026-05-20 11:00:00.000Z',
      },
      {
        description: 'Consultoria Jurídica Corporativa',
        amount: 12500.0,
        type: 'saida',
        category: 'Serviços Terceirizados',
        date: '2026-05-25 16:00:00.000Z',
      },
      {
        description: 'Aluguel Sede Administrativa',
        amount: 8200.0,
        type: 'saida',
        category: 'Aluguel & Infraestrutura',
        date: '2026-06-01 09:00:00.000Z',
      },
      {
        description: 'Repasse Contrato de Distribuição',
        amount: 62000.0,
        type: 'entrada',
        category: 'Receita Diretoria',
        date: '2026-06-10 15:00:00.000Z',
      },
      {
        description: 'Pagamento de DARF / Impostos Federais',
        amount: 14300.0,
        type: 'saida',
        category: 'Impostos & Taxas',
        date: '2026-06-18 13:00:00.000Z',
      },
      {
        description: 'Auditoria Contábil Anual',
        amount: 18000.0,
        type: 'saida',
        category: 'Serviços Terceirizados',
        date: '2026-06-28 17:00:00.000Z',
      },
      {
        description: 'Honorários da Diretoria Executiva',
        amount: 35000.0,
        type: 'saida',
        category: 'Honorários Diretoria',
        date: '2026-07-01 10:00:00.000Z',
      },
      {
        description: 'Receita de Dividendos Subsidiária',
        amount: 88000.0,
        type: 'entrada',
        category: 'Receita Diretoria',
        date: '2026-07-12 11:30:00.000Z',
      },
      {
        description: 'Licenças de Software & TI',
        amount: 6400.0,
        type: 'saida',
        category: 'Despesas Operacionais',
        date: '2026-07-20 14:00:00.000Z',
      },
      {
        description: 'Aporte Complementar Conselho',
        amount: 50000.0,
        type: 'entrada',
        category: 'Aporte Financeiro',
        date: '2026-08-01 09:00:00.000Z',
      },
      {
        description: 'Honorários da Diretoria Executiva',
        amount: 35000.0,
        type: 'saida',
        category: 'Honorários Diretoria',
        date: '2026-08-05 10:00:00.000Z',
      },
      {
        description: 'Tarifas Bancárias & Custódia',
        amount: 1250.0,
        type: 'saida',
        category: 'Impostos & Taxas',
        date: '2026-08-08 16:30:00.000Z',
      },
    ]

    try {
      const existing = app.countRecords('transactions')
      if (existing === 0) {
        for (let i = 0; i < sampleTxs.length; i++) {
          const tx = sampleTxs[i]
          const rec = new Record(txCol)
          rec.set('user', userId)
          rec.set('description', tx.description)
          rec.set('amount', tx.amount)
          rec.set('type', tx.type)
          rec.set('category', tx.category)
          rec.set('date', tx.date)
          rec.set('source_file', 'extrato_exemplo_diretoria.pdf')
          app.save(rec)
        }
      }
    } catch (_) {}
  },
  (app) => {},
)
