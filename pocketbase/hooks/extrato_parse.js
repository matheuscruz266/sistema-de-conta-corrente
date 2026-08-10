routerAdd(
  'POST',
  '/backend/v1/extrato/parse',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const rawText = body.content || ''
    const fileName = body.filename || 'extrato.txt'

    if (!rawText.trim()) {
      return e.badRequestError('Conteúdo do arquivo não fornecido para processamento')
    }

    try {
      const prompt =
        'Você é um especialista em processamento de extratos bancários brasileiros. ' +
        'Analise o texto a seguir extraído de um extrato bancário e extraia todas as transações em formato JSON válido.\n\n' +
        'Cada item no array JSON deve possuir exatamente:\n' +
        '- "description": string (descrição limpa)\n' +
        '- "amount": number (valor numérico positivo)\n' +
        '- "type": "entrada" ou "saida"\n' +
        '- "category": string (sugira uma entre: "Receita Diretoria", "Aporte Financeiro", "Honorários Diretoria", "Serviços Terceirizados", "Despesas Operacionais", "Aluguel & Infraestrutura", "Impostos & Taxas", "Outros")\n' +
        '- "date": string no formato YYYY-MM-DD\n\n' +
        'Retorne APENAS o JSON puro (array de objetos), sem marcações markdown ou introduções.\n\n' +
        'Texto do extrato:\n' +
        rawText

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um parser de extratos bancários que responde estritamente com um array JSON puro.',
          },
          { role: 'user', content: prompt },
        ],
      })

      let reply = aiRes.choices[0].message.content.trim()
      if (reply.startsWith('```json')) {
        reply = reply
          .replace(/^```json\s*/, '')
          .replace(/```$/, '')
          .trim()
      } else if (reply.startsWith('```')) {
        reply = reply
          .replace(/^```\s*/, '')
          .replace(/```$/, '')
          .trim()
      }

      let parsedTransactions = []
      try {
        parsedTransactions = JSON.parse(reply)
      } catch (_) {
        parsedTransactions = []
      }

      return e.json(200, {
        filename: fileName,
        transactions: Array.isArray(parsedTransactions) ? parsedTransactions : [],
      })
    } catch (err) {
      return e.json(500, { error: 'Erro ao processar o extrato: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
