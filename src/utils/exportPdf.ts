import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export function buildFilename(label: string): string {
  const now  = new Date()
  const dd   = String(now.getDate()).padStart(2, '0')
  const mm   = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = String(now.getFullYear())
  const slug = label.replace(/\s+/g, '_').toLowerCase()
  return `dashboard_${dd}${mm}${yyyy}_${slug}.pdf`
}

async function captureCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Força a altura natural do conteúdo antes de capturar,
  // evitando espaço em branco de containers flex/grid esticados
  const prevHeight    = element.style.height
  const prevOverflow  = element.style.overflow
  const prevPosition  = element.style.position

  element.style.height   = 'auto'
  element.style.overflow = 'visible'
  element.style.position = 'relative'

  // Garante que o DOM reflita as mudanças antes de capturar
  await new Promise(r => requestAnimationFrame(r))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0a0a0a',
    logging: false,
    foreignObjectRendering: false,
    height: element.scrollHeight,
    windowHeight: element.scrollHeight + 200,
  })

  element.style.height   = prevHeight
  element.style.overflow = prevOverflow
  element.style.position = prevPosition

  return canvas
}

// Largura fixa A4 landscape em pontos; altura se adapta ao conteúdo
const PDF_WIDTH_PT = 842

function canvasToPdfDims(canvas: HTMLCanvasElement) {
  const ratio  = PDF_WIDTH_PT / canvas.width
  const height = canvas.height * ratio
  return { width: PDF_WIDTH_PT, height, ratio }
}

// Exporta um único elemento como PDF com altura ajustada ao conteúdo
export async function exportDashboardPdf(
  element: HTMLElement,
  filename = 'dashboard.pdf'
): Promise<void> {
  const canvas = await captureCanvas(element)
  const { width, height } = canvasToPdfDims(canvas)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [width, height] })
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height)
  pdf.save(filename)
}

// Exporta múltiplos elementos (um por aba) num único PDF — cada aba = 1 página do seu tamanho exato
export async function exportAllTabsPdf(
  getElement: () => HTMLElement | null,
  tabs: string[],
  switchTab: (tab: string) => void,
  waitRender: () => Promise<void>,
  onProgress: (label: string) => void,
  filename = 'dashboard_completo.pdf'
): Promise<void> {
  let pdf: jsPDF | null = null

  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i]
    onProgress(`Capturando ${tab} (${i + 1}/${tabs.length})…`)
    switchTab(tab)
    await waitRender()

    const el = getElement()
    if (!el) continue

    const canvas = await captureCanvas(el)
    const { width, height } = canvasToPdfDims(canvas)

    if (!pdf) {
      pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: [width, height] })
    } else {
      pdf.addPage([width, height], 'landscape')
    }

    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height)
  }

  pdf?.save(filename)
}
