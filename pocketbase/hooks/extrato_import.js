routerAdd(
  'POST',
  '/backend/v1/extrato/import',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const transactions = body.transactions || []
    const fileName = body.filename || 'extrato_importado.pdf'
    const projectId = body.projectId || ''

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return e.badRequestError('Nenhuma movimentação para importar')
    }

    var isDuplicate = false
    try {
      var userExtratos = $app.findRecordsByFilter(
        'extratos',
        "user = '" + userId + "' && project = '" + projectId + "'",
        '-created',
        100,
        0,
      )
      for (var i = 0; i < userExtratos.length; i++) {
        if (userExtratos[i].getString('filename') === fileName) {
          isDuplicate = true
          break
        }
      }
    } catch (_) {}

    if (isDuplicate) {
      return e.badRequestError(
        'Este arquivo já foi importado anteriormente. Exclua o registro anterior no Histórico antes de reimportar.',
      )
    }

    var txCol = $app.findCollectionByNameOrId('transactions')
    var extratoCol = $app.findCollectionByNameOrId('extratos')
    var importedCount = 0
    var errors = []

    for (var j = 0; j < transactions.length; j++) {
      var item = transactions[j]
      if (!item.description || !item.amount || !item.type) {
        errors.push('Linha ' + (j + 1) + ': dados incompletos (descrição, valor ou tipo ausente)')
        continue
      }
      try {
        var rec = new Record(txCol)
        rec.set('user', userId)
        rec.set('description', String(item.description))
        rec.set('amount', Math.abs(Number(item.amount) || 0))
        rec.set('type', item.type === 'entrada' ? 'entrada' : 'saida')
        rec.set('category', item.category || 'Outros')
        var dtStr = item.date
        if (!dtStr) {
          dtStr = new Date().toISOString()
        } else if (typeof dtStr === 'string' && dtStr.indexOf('T') === -1) {
          dtStr = dtStr + 'T12:00:00.000Z'
        }
        rec.set('date', dtStr)
        rec.set('source_file', fileName)
        rec.set('project', projectId)
        $app.save(rec)
        importedCount++
      } catch (err) {
        errors.push('Linha ' + (j + 1) + ': ' + (err.message || 'erro ao salvar'))
      }
    }

    if (importedCount === 0) {
      return e.badRequestError('Nenhuma movimentação pôde ser importada. ' + errors.join('; '))
    }

    var extratoRec = new Record(extratoCol)
    extratoRec.set('user', userId)
    extratoRec.set('filename', fileName)
    extratoRec.set('transactions_count', importedCount)
    extratoRec.set('project', projectId)
    $app.save(extratoRec)

    return e.json(200, {
      success: true,
      importedCount: importedCount,
      filename: fileName,
      errors: errors.length > 0 ? errors : undefined,
    })
  },
  $apis.requireAuth(),
)
