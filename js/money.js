// =====================================================
//  돈 글자: 1억보다 작으면 $12,345,678 처럼 쉼표로, 1억부터는 우리말 단위로 (억 · 조 · 경 · 해 · 자)
//   예) $3억 2,500만 · $60억 · $1조 2,000억 · $5해
//   큰 단위 두 칸까지만 보여 줘요 (너무 길어지지 않게)
// =====================================================
const UNITS = [[1e24, '자'], [1e20, '해'], [1e16, '경'], [1e12, '조'], [1e8, '억'], [1e4, '만']];
export function fmtMoney(n) {
  n = Math.max(0, Math.floor(Number(n) || 0));
  if (n < 1e8) return '$' + n.toLocaleString('en-US');
  const parts = [];
  let rest = n;
  for (const [v, name] of UNITS) {
    if (rest < v) continue;
    const q = Math.floor(rest / v);
    parts.push(q.toLocaleString('en-US') + name);
    rest -= q * v;
    if (parts.length === 2) break;
  }
  return '$' + parts.join(' ');
}
