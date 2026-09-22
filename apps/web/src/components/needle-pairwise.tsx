export function NeedlePairwise({ tb, lm }: { tb: string; lm: string }) {
  const matchLine = tb
    .split("")
    .map((ch, i) => (ch !== "-" && ch === lm[i] ? "|" : " "))
    .join("");
  return (
    <pre className="overflow-auto rounded bg-slate-50 p-3 font-mono text-xs leading-5 whitespace-pre">
      {`TB  ${tb}\n    ${matchLine}\nLM  ${lm}`}
    </pre>
  );
}
