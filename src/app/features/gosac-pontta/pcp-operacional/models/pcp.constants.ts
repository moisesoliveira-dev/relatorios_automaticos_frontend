import { PcpAreaKey } from './pcp.models';

export const PCP_AREA_META: Record<PcpAreaKey, { label: string; short: string; offset: string; color: string }> = {
  molhada: { label: 'Áreas Molhadas', short: 'Molhada', offset: '+20 úteis', color: 'var(--cmm-accent)' },
  intima: { label: 'Áreas Íntimas', short: 'Íntima', offset: '+25 úteis', color: 'var(--cmm-warning)' },
  social: { label: 'Áreas Sociais', short: 'Social', offset: '+30 úteis', color: 'var(--cmm-success)' },
};

export const PCP_AREA_ORDER: PcpAreaKey[] = ['molhada', 'intima', 'social'];
export const PCP_WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
