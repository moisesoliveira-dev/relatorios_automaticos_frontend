export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addBusinessDays(baseDate: Date, businessDays: number): Date {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);

  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  return result;
}

export function adjustToTueThuFri(baseDate: Date): Date {
  const result = new Date(baseDate);
  result.setHours(0, 0, 0, 0);

  while (![2, 4, 5].includes(result.getDay())) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

export function computeAreaDeliveryDate(approvalDate: string | null, businessDays: number): string | null {
  const base = parseDateOnly(approvalDate);
  if (!base) return null;
  return toIsoDate(adjustToTueThuFri(addBusinessDays(base, businessDays)));
}

export function formatPcpDate(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.slice(0, 10).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function weekdayLabel(value: string | null | undefined): string {
  if (!value) return '';
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' });
}
