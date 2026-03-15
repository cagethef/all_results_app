export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d     = new Date(iso)
  const day   = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const h     = d.getHours().toString().padStart(2, '0')
  const m     = d.getMinutes().toString().padStart(2, '0')
  return `${day}/${month} às ${h}:${m}`
}
