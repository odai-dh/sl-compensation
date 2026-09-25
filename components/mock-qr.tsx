/** A QR-looking pattern derived from `data`. Not scannable – the BankID flow is mocked. */
export function MockQr({ data, size = 200 }: { data: string; size?: number }) {
  const n = 25;
  let seed = 0;
  for (let i = 0; i < data.length; i++) seed = (Math.imul(seed, 31) + data.charCodeAt(i)) | 0;
  const rand = () => {
    seed = (Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x6d2b79f5) | 0;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  const cells: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!inFinder(x, y) && rand() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  const finder = (x: number, y: number) =>
    `M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5zM${x + 2} ${y + 2}h3v3h-3z`;
  return (
    <svg
      role="img"
      aria-label="BankID QR code (demo)"
      viewBox={`-1 -1 ${n + 2} ${n + 2}`}
      width={size}
      height={size}
      className="rounded-md bg-white p-1"
      shapeRendering="crispEdges"
    >
      <path d={cells.join("")} fill="#0f172a" />
      <path d={`${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}`} fill="#0f172a" fillRule="evenodd" />
    </svg>
  );
}
