export function catalogueCsv(rows: Record<string, string | number | null | undefined>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers.map(cell).join(';'), ...rows.map(row => headers.map(key => cell(row[key])).join(';'))].join('\r\n');
}
export function downloadCatalogueCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  const url = URL.createObjectURL(new Blob([catalogueCsv(rows)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
