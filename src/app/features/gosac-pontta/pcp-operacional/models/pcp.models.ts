export type PcpAreaKey = 'molhada' | 'intima' | 'social';

export interface PcpAreaSchedule {
  date: string;
  environments: string[];
  conflictAdjusted: boolean;
}

export interface PcpSalesOrderSchedule {
  ponttaId: string;
  code: string;
  customerName: string;
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
