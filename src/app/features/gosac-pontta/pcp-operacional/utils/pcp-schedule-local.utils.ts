import {
  PcpAreaConfig,
  PcpAreaKey,
  PcpCalendarDay,
  PcpScheduleResponse,
  areaOrderFromConfig,
} from '../models/pcp.models';
import { computeAreaDeliveryDate } from './pcp-date.utils';

/** Atualiza o schedule em memória após salvar override — evita refetch caro ao Pontta. */
export function applyEnvironmentOverrideToSchedule(
  schedule: PcpScheduleResponse,
  environmentName: string,
  area: PcpAreaKey,
  areaConfig: PcpAreaConfig,
): PcpScheduleResponse {
  const businessDays = areaConfig.areas.find((item) => item.key === area)?.businessDays ?? 0;
  let changed = false;

  const salesOrders = schedule.salesOrders.map((order) => {
    if (!order.unclassified.includes(environmentName)) return order;

    changed = true;
    const unclassified = order.unclassified.filter((name) => name !== environmentName);
    const areas = { ...order.areas };
    const existing = areas[area];

    if (existing) {
      areas[area] = {
        ...existing,
        environments: [...existing.environments, environmentName],
      };
    } else {
      const date = computeAreaDeliveryDate(order.approvalDate, businessDays);
      if (!date) return { ...order, unclassified };

      areas[area] = {
        date,
        environments: [environmentName],
        conflictAdjusted: false,
      };
    }

    return { ...order, unclassified, areas };
  });

  if (!changed) return schedule;

  return {
    ...schedule,
    salesOrders,
    calendar: buildCalendarFromOrders(salesOrders, areaOrderFromConfig(areaConfig)),
  };
}

function buildCalendarFromOrders(
  orders: PcpScheduleResponse['salesOrders'],
  areaKeys: PcpAreaKey[],
): PcpCalendarDay[] {
  const byDate = new Map<string, PcpCalendarDay['entries']>();

  for (const order of orders) {
    for (const area of areaKeys) {
      const schedule = order.areas[area];
      if (!schedule) continue;

      const entries = byDate.get(schedule.date) ?? [];
      entries.push({
        salesOrderCode: order.code,
        customerName: order.customerName,
        area,
        environments: schedule.environments,
      });
      byDate.set(schedule.date, entries);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, entries]) => ({
      date,
      entries: entries.sort((a, b) => {
        const areaOrder = areaKeys.indexOf(a.area) - areaKeys.indexOf(b.area);
        if (areaOrder !== 0) return areaOrder;
        return a.salesOrderCode.localeCompare(b.salesOrderCode, 'pt-BR', { numeric: true });
      }),
    }));
}
