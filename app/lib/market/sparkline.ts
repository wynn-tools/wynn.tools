/** Map a numeric series to [x, y] SVG points within width×height; Y is flipped (max at top). */
export function sparklinePoints(values: number[], width: number, height: number): [number, number][] {
  if (values.length < 2)
    return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const stepX = width / (values.length - 1)
  return values.map((v, i) => {
    const x = i * stepX
    const y = span === 0 ? height / 2 : height - ((v - min) / span) * height
    return [x, y]
  })
}
