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

    if (!rawContent || (typeof rawContent === 'string' && !rawContent.trim())) {
      return e.badRequestError('Arquivo vazio ou sem conteúdo legível')
    }

    function decodeBase64(b64) {
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var lookup = {}
      for (var i = 0; i < 64; i++) lookup[chars[i]] = i
      var clean = b64.replace(/[^A-Za-z0-9+/]/g, '')
      var bytes = []
      for (var j = 0; j < clean.length; j += 4) {
        var a = lookup[clean[j]] || 0
        var b = lookup[clean[j + 1]] || 0
        var c = lookup[clean[j + 2]] || 0
        var d = lookup[clean[j + 3]] || 0
        var n = (a << 18) | (b << 12) | (c << 6) | d
        bytes.push((n >> 16) & 255)
        if (clean[j + 2] !== '=' && j + 2 < clean.length) bytes.push((n >> 8) & 255)
        if (clean[j + 3] !== '=' && j + 3 < clean.length) bytes.push(n & 255)
      }
      return bytes
    }

    function decodePdfString(s) {
      return s
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
    }

    function extractPdfText(streamData) {
      var texts = []
      var m
      var tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g
      while ((m = tjRegex.exec(streamData)) !== null) {
        var dec = decodePdfString(m[1])
        if (dec.trim()) texts.push(dec)
      }
      var tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g
      while ((m = tjArrRegex.exec(streamData)) !== null) {
        var inner = m[1].match(/\(((?:[^()\\]|\\.)*)\)/g)
        if (inner) {
          var line = inner
            .map(function (s) {
              return decodePdfString(s.slice(1, -1))
            })
            .join('')
          if (line.trim()) texts.push(line)
        }
      }
      return texts
    }

    function parsePdfContent(b64) {
      var pdfBytes = decodeBase64(b64)
      var binStr = ''
      for (var i = 0; i < pdfBytes.length; i++) binStr += String.fromCharCode(pdfBytes[i])

      var texts = []
      var streamRegex = /stream\r?\n([\s\S]*?)endstream/g
      var match
      while ((match = streamRegex.exec(binStr)) !== null) {
        var streamData = match[1]
        var beforeStream = binStr.substring(Math.max(0, match.index - 300), match.index)
        var isFlate = beforeStream.indexOf('FlateDecode') !== -1

        if (!isFlate) {
          texts = texts.concat(extractPdfText(streamData))
        }
      }

      var asciiRegex = /[\x20-\x7E]{10,}/g
      var am
      while ((am = asciiRegex.exec(binStr)) !== null) {
        var s = am[0]
        if (s.indexOf('endobj') !== -1 || s.indexOf('stream') !== -1) continue
        if (/[\d.,]+,\d{2}|\d{2}\/\d{2}\/\d{2,4}|R\$|PIX|DEP[Cc]|PAG|TRF|TRANSF/i.test(s)) {
          texts.push(s.trim())
        }
      }

      return texts.join('\n').trim()
    }

    function parseXlsxContent(b64) {
      try {
        return parseXlsxContentLegacy(b64)
      } catch (e) {
        return null
      }
    }

    function parseXlsxContentLegacy(b64) {
      var bytes = decodeBase64(b64)
      var entries = {}
      var i = 0

      while (i < bytes.length - 4) {
        if (bytes[i] === 80 && bytes[i + 1] === 75 && bytes[i + 2] === 3 && bytes[i + 3] === 4) {
          var compMethod = bytes[i + 8] | (bytes[i + 9] << 8)
          var compSize =
            bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24)
          var nameLen = bytes[i + 26] | (bytes[i + 27] << 8)
          var extraLen = bytes[i + 28] | (bytes[i + 29] << 8)
          var nameStart = i + 30
          var name = ''
          for (var j = 0; j < nameLen; j++) name += String.fromCharCode(bytes[nameStart + j])
          var dataStart = nameStart + nameLen + extraLen

          if (compSize === 0) {
            var nextPk = bytes.length
            for (var ni = dataStart + 1; ni < bytes.length - 1; ni++) {
              if (bytes[ni] === 80 && bytes[ni + 1] === 75) {
                nextPk = ni
                break
              }
            }
            compSize = nextPk - dataStart
          }

          if (compMethod === 0) {
            var str = ''
            for (var k = dataStart; k < dataStart + compSize; k++)
              str += String.fromCharCode(bytes[k])
            entries[name] = str
          }
          i = dataStart + compSize
        } else {
          i++
        }
      }

      var sharedStrings = []
      var ssXml = entries['xl/sharedStrings.xml']
      if (ssXml) {
        var siRegex = /<si[^>]*>([\s\S]*?)<\/si>/g
        var m
        while ((m = siRegex.exec(ssXml)) !== null) {
          var tMatches = m[1].match(/<t[^>]*>([\s\S]*?)<\/t>/g)
          if (tMatches) {
            sharedStrings.push(
              tMatches
                .map(function (t) {
                  return t.replace(/<[^>]+>/g, '')
                })
                .join(''),
            )
          } else {
            sharedStrings.push('')
          }
        }
      }

      var sheetXml = entries['xl/worksheets/sheet1.xml']
      if (!sheetXml) {
        var keys = Object.keys(entries)
        for (var ki = 0; ki < keys.length; ki++) {
          if (keys[ki].indexOf('xl/worksheets/sheet') === 0 && keys[ki].indexOf('.xml') !== -1) {
            sheetXml = entries[keys[ki]]
            break
          }
        }
      }
      if (!sheetXml) return null

      var rows = []
      var rowRegex = /<row[^>]*>([\s\S]*?)<\/row>/g
      var rm
      while ((rm = rowRegex.exec(sheetXml)) !== null) {
        var rowData = []
        var cellParts = rm[1].split(/<\/c>/)
        for (var ci = 0; ci < cellParts.length; ci++) {
          var cell = cellParts[ci]
          if (cell.indexOf('<c') === -1) continue
          var typeMatch = cell.match(/t="([^"]*)"/)
          var cellType = typeMatch ? typeMatch[1] : ''
          var valMatch = cell.match(/<v>([\s\S]*?)<\/v>/)
          var val = valMatch ? valMatch[1] : ''
          var isMatch = cell.match(/<is><t[^>]*>([\s\S]*?)<\/t>/)

          if (cellType === 's' && val) {
            rowData.push(sharedStrings[parseInt(val, 10)] || val)
          } else if (cellType === 'inlineStr' && isMatch) {
            rowData.push(isMatch[1])
          } else if (val) {
            rowData.push(val)
          } else {
            rowData.push('')
          }
        }
        if (rowData.length > 0) rows.push(rowData)
      }

      if (rows.length === 0) return null
      return rows
        .map(function (row) {
          return row.join('\t')
        })
        .join('\n')
    }

    function parseOfx(text) {
      var transactions = []
      var stmtRegex = /<STMTTRN>\s*([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/CCTRANLIST>|$)/g
      var sm
      while ((sm = stmtRegex.exec(text)) !== null) {
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

        var rawAmount = parseFloat(trnAmt) || 0
        var amount = Math.abs(rawAmount)
        if (amount <= 0) continue

        var type = rawAmount > 0 ? 'entrada' : 'saida'
        if (trnType) {
          var tt = trnType.toUpperCase()
          if (tt === 'CREDIT') type = 'entrada'
          else if (tt === 'DEBIT') type = 'saida'
        }

        transactions.push({
          description: name || memo || 'Transação',
          amount: amount,
          type: type,
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
      return transactions
    }

    function parseWithAI(text) {
      var prompt =
        'Você é um especialista em processamento de extratos bancários brasileiros. ' +
        'Analise o texto a seguir extraído de um extrato bancário e extraia todas as transações em formato JSON válido.\n\n' +
        'Cada item no array JSON deve possuir exatamente:\n' +
        '- "description": string (descrição limpa da transação)\n' +
        '- "amount": number (valor numérico positivo)\n' +
        '- "type": "entrada" ou "saida"\n' +
        '- "category": string (sugira uma entre: "Receita Diretoria", "Aporte Financeiro", "Honorários Diretoria", "Serviços Terceirizados", "Despesas Operacionais", "Aluguel & Infraestrutura", "Impostos & Taxas", "Outros")\n' +
        '- "date": string no formato YYYY-MM-DD\n\n' +
        'IMPORTANTE — Classificação do tipo (entrada/saida):\n' +
        '- "entrada" = receita, crédito, depósito, transferência recebida, pix recebido, pagamento recebido\n' +
        '- "saida" = despesa, débito, pagamento, saque, transferência enviada, pix enviado\n' +
        '- Se houver coluna de tipo no CSV/Excel, use-a como referência principal\n' +
        '- Se houver colunas separadas de crédito/débito: crédito = "entrada", débito = "saida"\n' +
        '- Se houver sinal no valor: positivo = "entrada", negativo = "saida"\n' +
        '- Palavras-chave de entrada: depósito, crédito, recebimento, transferência recebida, pix recebido, repasse, aporte, rendimento\n' +
        '- Palavras-chave de saída: pagamento, débito, transferência enviada, pix enviado, tarifa, taxa, saque, compra, despesa\n\n' +
        'Retorne APENAS o JSON puro (array de objetos), sem marcações markdown ou introduções.\n\n' +
        'Texto do extrato:\n' +
        text.substring(0, 30000)

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

      var parsed = []
      try {
        parsed = JSON.parse(reply)
      } catch (_) {
        var jsonMatch = reply.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0])
          } catch (__) {}
        }
      }
      return parsed
    }

    if (format === 'ofx') {
      var ofxTx = parseOfx(rawContent)
      if (ofxTx.length > 0) return e.json(200, { filename: fileName, transactions: ofxTx })
      return e.badRequestError(
        'Nenhuma transação OFX encontrada. Verifique se o arquivo contém blocos <STMTTRN> válidos.',
      )
    }

    if (format === 'pdf') {
      var pdfText = parsePdfContent(rawContent)
      if (!pdfText || pdfText.length < 10) {
        return e.badRequestError(
          'Não foi possível extrair texto do PDF. O arquivo pode estar protegido, criptografado ou ser uma imagem escaneada. Tente exportar como CSV ou TXT.',
        )
      }
      try {
        var pdfTx = parseWithAI(pdfText)
        if (!Array.isArray(pdfTx) || pdfTx.length === 0) {
          return e.badRequestError(
            'Nenhuma transação identificada no PDF. O conteúdo pode não ser um extrato bancário reconhecível.',
          )
        }
        return e.json(200, { filename: fileName, transactions: pdfTx })
      } catch (err) {
        return e.internalServerError(
          'Erro ao processar PDF com IA: ' + (err.message || 'erro desconhecido'),
        )
      }
    }

    if (format === 'xlsx' || format === 'xls') {
      var xlsxText = parseXlsxContent(rawContent)
      if (!xlsxText) {
        return e.badRequestError(
          'Não foi possível ler o arquivo Excel. Verifique se o arquivo não está corrompido ou protegido. Tente exportar como CSV.',
        )
      }
      try {
        var xlsxTx = parseWithAI(xlsxText)
        if (!Array.isArray(xlsxTx) || xlsxTx.length === 0) {
          return e.badRequestError(
            'Nenhuma transação identificada no arquivo Excel. Verifique se o conteúdo é um extrato bancário.',
          )
        }
        return e.json(200, { filename: fileName, transactions: xlsxTx })
      } catch (err) {
        return e.internalServerError(
          'Erro ao processar Excel com IA: ' + (err.message || 'erro desconhecido'),
        )
      }
    }

    var textContent = rawContent
    if (!textContent.trim()) {
      return e.badRequestError(
        'Formato não reconhecido. Envie um arquivo PDF, OFX, Excel, CSV ou TXT.',
      )
    }

    try {
      var txResult = parseWithAI(textContent)
      if (!Array.isArray(txResult) || txResult.length === 0) {
        return e.badRequestError(
          'Nenhuma transação identificada no arquivo. Verifique se o conteúdo está no formato correto (CSV, TXT ou OFX).',
        )
      }
      return e.json(200, { filename: fileName, transactions: txResult })
    } catch (err) {
      return e.internalServerError(
        'Erro ao processar o extrato com IA: ' + (err.message || 'erro desconhecido'),
      )
    }
  },
  $apis.requireAuth(),
)
