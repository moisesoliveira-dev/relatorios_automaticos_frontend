/**
 * @deprecated Importe de `features/gosac-pontta/data/gosac-api.service` ou use a Facade.
 * Mantido para compatibilidade com imports existentes.
 */
export {
  GosacApiService as GosacService,
  GosacApiService,
  type GosacTicket,
  type SalesOrder,
  type GosacGroup,
  type SalesOrderSearchResult,
  type PonttaProposal,
} from '../features/gosac-pontta/data/gosac-api.service';

export type {
  PcpAreaKey,
  PcpAreaSchedule,
  PcpSalesOrderSchedule,
  PcpCalendarEntry,
  PcpCalendarDay,
  PcpScheduleResponse,
} from '../features/gosac-pontta/pcp-operacional/models/pcp.models';
