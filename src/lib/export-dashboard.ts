export interface ExportKPI {
  label: string
  value: string
  color: string
}

async function svgToImage(svg: SVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGElement
  const rect = svg.getBoundingClientRect()
  const width = rect.width || parseFloat(svg.getAttribute('width') || '800')
  const height = rect.height || parseFloat(svg.getAttribute('height') || '400')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }

  const allElements = clone.querySelectorAll('*')
  const styleProps = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-dasharray',
    'font-size',
    'font-family',
    'font-weight',
    'text-anchor',
    'dominant-baseline',
    'fill-opacity',
    'stroke-opacity',
    'opacity',
  ]
  allElements.forEach((el) => {
    const computed = window.getComputedStyle(el)
    const styles = styleProps
      .map((prop) => `${prop}: ${computed.getPropertyValue(prop)}`)
      .join('; ')
    el.setAttribute('style', styles)
  })

  const serializer = new XMLSerializer()
  const svgString = serializer.serializeToString(clone)
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao converter gráfico SVG.'))
    }
    img.src = url
  })
}

export async function exportDashboardAsPNG(
  container: HTMLElement,
  projectName: string,
  exportDate: string,
  kpis: ExportKPI[],
): Promise<void> {
  const svgs = Array.from(container.querySelectorAll('.recharts-wrapper svg')) as SVGElement[]

  if (svgs.length === 0) {
    throw new Error('Nenhum gráfico encontrado no dashboard para exportar.')
  }

  const W = 1200
  const PADDING = 40
  const HEADER_H = 90
  const KPI_H = 100
  const CHART_H = 300
  const GAP = 24
  const totalH = PADDING + HEADER_H + KPI_H + svgs.length * (CHART_H + GAP) + PADDING

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = totalH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível criar o canvas para exportação.')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, totalH)

  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 28px Inter, system-ui, sans-serif'
  ctx.fillText(projectName, PADDING, PADDING + 28)

  ctx.fillStyle = '#64748b'
  ctx.font = '14px Inter, system-ui, sans-serif'
  ctx.fillText(`Relatório exportado em ${exportDate}`, PADDING, PADDING + 52)

  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, PADDING + HEADER_H - 10)
  ctx.lineTo(W - PADDING, PADDING + HEADER_H - 10)
  ctx.stroke()

  if (kpis.length > 0) {
    const kpiW = (W - PADDING * 2 - (kpis.length - 1) * 12) / kpis.length
    const kpiY = PADDING + HEADER_H
    kpis.forEach((kpi, i) => {
      const x = PADDING + i * (kpiW + 12)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(x, kpiY, kpiW, 80)
      ctx.fillStyle = kpi.color
      ctx.fillRect(x, kpiY, kpiW, 3)
      ctx.fillStyle = kpi.color
      ctx.font = 'bold 22px Inter, system-ui, sans-serif'
      ctx.fillText(kpi.value, x + 16, kpiY + 38)
      ctx.fillStyle = '#64748b'
      ctx.font = '11px Inter, system-ui, sans-serif'
      ctx.fillText(kpi.label, x + 16, kpiY + 60)
    })
  }

  let chartY = PADDING + HEADER_H + KPI_H
  for (const svg of svgs) {
    try {
      const img = await svgToImage(svg)
      const drawW = W - PADDING * 2
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(PADDING, chartY, drawW, CHART_H - 20)
      ctx.drawImage(img, PADDING, chartY, drawW, CHART_H - 20)
    } catch {
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(PADDING, chartY, W - PADDING * 2, CHART_H - 20)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px Inter, system-ui, sans-serif'
      ctx.fillText('[Gráfico não pôde ser renderizado]', PADDING + 20, chartY + CHART_H / 2)
    }
    chartY += CHART_H + GAP
  }

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Falha ao gerar imagem PNG.'))
        return
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `relatorio_${projectName.replace(/\s+/g, '_').toLowerCase()}.png`
      link.href = url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      resolve()
    }, 'image/png')
  })
}
