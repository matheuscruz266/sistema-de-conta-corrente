routerAdd(
  'POST',
  '/backend/v1/extrato/import',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const transactions = body.transactions || []
    const fileName = body.filename || 'extrato_importado.pdf'

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return e.badRequestError('Nenhuma movimentação para importar')
    }

    const txCol = $app.findCollectionByNameOrId('transactions')
    const extratoCol = $app.findCollectionByNameOrId('extratos')

    let importedCount = 0
    for (let i = 0; i < transactions.length; i++) {
      const item = transactions[i]
      if (!item.description || !item.amount || !item.type) continue

      const rec = new Record(txCol)
      rec.set('user', userId)
      rec.set('description', String(item.description))
      rec.set('amount', Math.abs(Number(item.amount) || 0))
      rec.set('type', item.type === 'entrada' ? 'entrada' : 'saida')
      rec.set('category', item.category || 'Outros')

      let dtStr = item.date
      if (!dtStr) {
        dtStr = new Date().toISOString()
      } else if (!dtStr.includes('T')) {
        dtStr = dtStr + ' 12:00:00.000Z'
      }
      rec.set('date', dtStr)
      rec.set('source_file', fileName)
      $app.save(rec)
      importedCount++
    }

    const extratoRec = new Record(extratoCol)
    extratoRec.set('user', userId)
    extratoRec.set('filename', fileName)
    extratoRec.set('transactions_count', importedCount)
    $app.save(extratoRec)

    return e.json(200, {
      success: true,
      importedCount: importedCount,
      filename: fileName,
    })
  },
  $apis.requireAuth(),
)
