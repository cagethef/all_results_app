export function playFailSound() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)

    // Dois beeps curtos descendentes — som de erro
    const beep = (startTime: number) => {
      const osc = ctx.createOscillator()
      osc.connect(gain)
      osc.type = 'square'
      osc.frequency.setValueAtTime(440, startTime)
      osc.frequency.linearRampToValueAtTime(220, startTime + 0.15)
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)
      osc.start(startTime)
      osc.stop(startTime + 0.15)
    }

    beep(ctx.currentTime)
    beep(ctx.currentTime + 0.2)
  } catch {
    // browser sem suporte a Web Audio — ignora silenciosamente
  }
}
