/**
 * Sparkline - 极简折线图 (纯 SVG, 无依赖)
 * data: [{ date: string, value: number }]
 */
export default function Sparkline({
  data,
  height = 80,
  stroke = '#15803d',
  fill = 'rgba(21, 128, 61, 0.10)',
  showAxis = true,
}: {
  data: { date: string; value: number }[];
  height?: number;
  stroke?: string;
  fill?: string;
  showAxis?: boolean;
}) {
  if (!data.length) return null;
  const W = 600;
  const H = height;
  const padX = 28;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const range = max - min || 1;
  const stepX = innerW / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((d.value - min) / range) * innerH;
    return { x, y, ...d };
  });
  const linePath = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${padY + innerH} L${points[0].x},${padY + innerH} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 3 : 1.5} fill={stroke} />
      ))}
      {showAxis && points.map((p, i) => (
        <text key={`t${i}`} x={p.x} y={H - 2} fontSize="10" textAnchor="middle" fill="#a8a29e">{p.date}</text>
      ))}
      {showAxis && (
        <>
          <text x={4} y={padY + 4} fontSize="10" fill="#a8a29e">{max.toFixed(1)}</text>
          <text x={4} y={H - padY} fontSize="10" fill="#a8a29e">{min.toFixed(1)}</text>
        </>
      )}
    </svg>
  );
}
