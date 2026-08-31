export type PcpAreaKey = 'molhada' | 'intima' | 'social';

export interface PcpAreaConfigItem {
  key: PcpAreaKey;
  label: string;
  short: string;
  businessDays: number;
  color: string;
}

export interface PcpAreaConfig {
  baseDateLabel: string;
  areas: PcpAreaConfigItem[];
}

export interface PcpAreaSchedule {
  date: string;
  environments: string[];
  conflictAdjusted: boolean;
}

export interface PcpSalesOrderSchedule {
  ponttaId: string;
  code: string;
  customerName: string;
  approvalDate: string | null;
  deliveryDate: string | null;
  areas: Partial<Record<PcpAreaKey, PcpAreaSchedule>>;
  unclassified: string[];
}

export interface PcpCalendarEntry {
  salesOrderCode: string;
  customerName: string;
  area: PcpAreaKey;
  environments: string[];
}

export interface PcpCalendarDay {
  date: string;
  entries: PcpCalendarEntry[];
}

export interface PcpScheduleResponse {
  asOf: string;
  areaConfig: PcpAreaConfig;
  salesOrders: PcpSalesOrderSchedule[];
  calendar: PcpCalendarDay[];
  environmentsPending?: boolean;
}

export interface PcpAnimStep {
  orderCode: string;
  customerName: string;
  area: PcpAreaKey;
  date: string;
  environments: string[];
}

export interface PcpCalendarCell {
  key: string;
  day: number;
  date: string;
  inMonth: boolean;
  isDeliveryDay: boolean;
  hasDeliveries: boolean;
  count: number;
  selected: boolean;
  areas: PcpAreaKey[];
  revealed: boolean;
}

export interface PcpAreaMeta {
  label: string;
  short: string;
  offset: string;
  color: string;
}

export const DEFAULT_PCP_AREA_CONFIG: PcpAreaConfig = {
  baseDateLabel: 'Prazo calculado — Aprovação do Projeto Executivo',
  areas: [
    { key: 'molhada', label: 'Áreas Molhadas', short: 'Molhada', businessDays: 15, color: '#22c55e' },
    { key: 'intima', label: 'Áreas Íntimas', short: 'Íntima', businessDays: 22, color: '#eab308' },
    { key: 'social', label: 'Áreas Sociais', short: 'Social', businessDays: 29, color: '#3b82f6' },
  ],
};

export function buildAreaMeta(config: PcpAreaConfig): Record<PcpAreaKey, PcpAreaMeta> {
  const meta = {} as Record<PcpAreaKey, PcpAreaMeta>;
  for (const area of config.areas) {
    meta[area.key] = {
      label: area.label,
      short: area.short,
      offset: `+${area.businessDays} úteis`,
      color: area.color,
    };
  }
  return meta;
}

export function areaOrderFromConfig(config: PcpAreaConfig): PcpAreaKey[] {
  return config.areas.map((a) => a.key);
}
