import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Traços no estilo "line icons" (24x24). Cada nome é uma lista de caminhos SVG. */
const ICONS = {
  mensagem: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
  confirmacao: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'],
  escolha: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  pergunta: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01'],
  arquivo: ['m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48'],
  ferramenta: ['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z'],
  atendente: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M5 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  fim: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7'],
  play: ['M6 4l14 8-14 8z'],
  ajustes: ['M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4'],
  mais: ['M12 5v14M5 12h14'],
  voltar: ['m12 19-7-7 7-7M19 12H5'],
  cima: ['m18 15-6-6-6 6'],
  baixo: ['m6 9 6 6 6-6'],
  lixeira: ['M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6'],
  fechar: ['M18 6 6 18M6 6l12 12'],
  mais_opcoes: ['M12 12h.01M19 12h.01M5 12h.01'],
  lapis: ['M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z'],
  pasta: ['M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z'],
  brilho: ['m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z'],
  livro: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  estrela: ['m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z'],
  desfazer: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5'],
  check: ['M20 6 9 17l-5-5'],
  alerta: ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01'],
  enviar: ['m22 2-7 20-4-9-9-4zM22 2 11 13'],
  painel: ['M12 20V10M18 20V4M6 20v-4'],
  conversas: ['M7.9 20A9 9 0 1 0 4 16.1L2 22z'],
  teste: ['M10 2v7.31L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20l-6-10.69V2M8.5 2h7'],
  fluxo: ['M3 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M17 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 7v4a4 4 0 0 0 4 4h6a2 2 0 0 1 2 2'],
  power: ['M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10'],
  chevron: ['m9 18 6-6-6-6'],
  info: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 16v-4M12 8h.01'],
  calendario: ['M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  pin: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM9 10a3 3 0 1 0 6 0a3 3 0 1 0-6 0'],
  casa: ['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10'],
  cracha: ['M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M6 16c.5-1.5 1.7-2 3-2s2.5.5 3 2M15 10h4M15 14h3'],
  copiar: ['M9 9h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1'],
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="stroke()" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">@for (d of paths(); track $index) {<path [attr.d]="d" />}</svg>`,
  styles: [`:host { display: inline-flex; flex-shrink: 0; line-height: 0; } svg { display: block; }`],
})
export class IconComponent {
  name = input.required<IconName>();
  size = input(18);
  stroke = input(1.9);
  paths = computed<readonly string[]>(() => ICONS[this.name()] ?? []);
}
