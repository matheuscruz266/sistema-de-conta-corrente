// @deps xlsx@0.18.5, pako@2.1.0
routerAdd(
  'POST',
  '/backend/v1/extrato/parse',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const rawContent = body.content || ''
    const fileName = body.filename || 'extrato.txt'
    const format = (body.format || (fileName || '').split('.').pop() || '').toLowerCase()
    const isBase64 = !!body.isBase64

    if (!rawContent || (typeof rawContent === 'string' && !rawContent.trim())) {
      return e.badRequestError('Arquivo vazio ou sem conteúdo legível')
    }

    var textContent = ''

    if (format === 'xlsx' || format === 'xls') {
      try {
        var XLSX = require('xlsx')
        var workbook = XLSX.read(rawContent, { type: 'base64' })
        var firstSheetName = workbook.SheetNames[0]
        if (!firstSheetName) return e.badRequestError('Planilha Excel sem abas ou vazia')
        var sheet = workbook.Sheets[firstSheetName]
        textContent = XLSX.utils.sheet_to_csv(sheet, { FS: ';', RS: '\n' })
        if (!textContent.trim())
          return e.badRequestError('A planilha Excel não contém dados legíveis')
      } catch (err) {
        return e.badRequestError(
          'Erro ao ler arquivo Excel: ' + (err.message || 'formato inválido'),
        )
      }
    } else if (format === 'pdf') {
      try {
        var chars64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
        var lookup = {}
        for (var i = 0; i < 64; i++) lookup[chars64[i]] = i
        var b64 = rawContent.replace(/[^A-Za-z0-9+/]/g, '')
        var pdfBytes = []
        for (var i2 = 0; i2 < b64.length; i2 += 4) {
          var a = lookup[b64[i2]] || 0
          var b = lookup[b64[i2 + 1]] || 0
          var c = lookup[b64[i2 + 2]] || 0
          var d = lookup[b64[i2 + 3]] || 0
          var n = (a << 18) | (b << 12) | (c << 6) | d
          pdfBytes.push((n >> 16) & 255)
          if (b64[i2 + 2] !== '=' && i2 + 2 < b64.length) pdfBytes.push((n >> 8) & 255)
          if (b64[i2 + 3] !== '=' && i2 + 3 < b64.length) pdfBytes.push(n & 255)
        }
        var binStr = ''
        for (var i3 = 0; i3 < pdfBytes.length; i3++) binStr += String.fromCharCode(pdfBytes[i3])

        var texts = []
        var streamRegex = /stream\r?\n([\s\S]*?)endstream/g
        var match
        while ((match = streamRegex.exec(binStr)) !== null) {
          var streamData = match[1]
          var beforeStream = binStr.substring(Math.max(0, match.index - 300), match.index)
          var isFlate = beforeStream.indexOf('FlateDecode') !== -1
          if (isFlate) {
            try {
              var pako = require('pako')
              var sBytes = new Uint8Array(streamData.length)
              for (var si = 0; si < streamData.length; si++) sBytes[si] = streamData.charCodeAt(si)
              var inflated = pako.inflate(sBytes)
              streamData = ''
              for (var ii = 0; ii < inflated.length; ii++)
                streamData += String.fromCharCode(inflated[ii])
            } catch (_) {}
          }
          var tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g
          var m
          while ((m = tjRegex.exec(streamData)) !== null) {
            var dec = m[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\')
            if (dec.trim()) texts.push(dec)
          }
          var tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g
          while ((m = tjArrRegex.exec(streamData)) !== null) {
            var inner = m[1].match(/\(((?:[^()\\]|\\.)*)\)/g)
            if (inner) {
              var line = inner
                .map(function (s) {
                  return s
                    .slice(1, -1)
                    .replace(/\\n/g, '\n')
                    .replace(/\\r/g, '\r')
                    .replace(/\\t/g, '\t')
                    .replace(/\\\(/g, '(')
                    .replace(/\\\)/g, ')')
                    .replace(/\\\\/g, '\\')
                })
                .join('')
              if (line.trim()) texts.push(line)
            }
          }
        }
        textContent = texts.join('\n').trim()
        if (!textContent || textContent.length < 10) {
          return e.badRequestError(
            'Não foi possível extrair texto do PDF. O arquivo pode estar protegido, criptografado ou ser uma imagem escaneada. Tente exportar como CSV ou TXT.',
          )
        }
      } catch (err) {
        return e.badRequestError('Erro ao processar PDF: ' + (err.message || 'formato inválido'))
      }
    } else if (format === 'ofx') {
      textContent = rawContent
      var ofxTx = []
      var stmtRegex = /<STMTTRN>\s*([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCTRANLIST>|$)/g
      var sm
      while ((sm = stmtRegex.exec(textContent)) !== null) {
        var block = sm[1]
        function getVal(tag) {
          var r = block.match(new RegExp('<' + tag + '>\\s*([^<\\r\\n]*)', 'i'))
          return r ? r[1].trim() : ''
        }
        var trnType = getVal('TRNTYPE')
        var dtPosted = getVal('DTPOSTED')
        var trnAmt = getVal('TRNAMT')
        var name = getVal('NAME')
        var memo = getVal('MEMO')
        var amount = Math.abs(parseFloat(trnAmt) || 0)
        if (amount <= 0) continue
        ofxTx.push({
          description: name || memo || 'Transação',
          amount: amount,
          type: trnType.toUpperCase() === 'CREDIT' ? 'entrada' : 'saida',
          category: 'Outros',
          date:
            dtPosted.length >= 8
              ? dtPosted.substring(0, 4) +
                '-' +
                dtPosted.substring(4, 6) +
                '-' +
                dtPosted.substring(6, 8)
              : new Date().toISOString().substring(0, 10),
        })
      }
      if (ofxTx.length > 0) return e.json(200, { filename: fileName, transactions: ofxTx })
    } else {
      textContent = rawContent
    }

    if (!textContent.trim()) {
      return e.badRequestError('Não foi possível identificar transações no conteúdo do arquivo')
    }

    try {
      var prompt =
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
        textContent.substring(0, 30000)

      var aiRes = $ai.chat({
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

      var reply = aiRes.choices[0].message.content.trim()
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

      var parsedTransactions = []
      try {
        parsedTransactions = JSON.parse(reply)
      } catch (_) {
        var jsonMatch = reply.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            parsedTransactions = JSON.parse(jsonMatch[0])
          } catch (__) {}
        }
      }

      if (!Array.isArray(parsedTransactions) || parsedTransactions.length === 0) {
        return e.badRequestError(
          'Não foi possível identificar transações no arquivo. Verifique se o conteúdo está no formato correto.',
        )
      }

      return e.json(200, { filename: fileName, transactions: parsedTransactions })
    } catch (err) {
      return e.json(500, {
        error: 'Erro ao processar o extrato com IA: ' + (err.message || 'erro desconhecido'),
      })
    }
  },
  $apis.requireAuth(),
)
