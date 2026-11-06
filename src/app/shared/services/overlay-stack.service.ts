import { Injectable } from '@angular/core';

/**
 * Pilha dos painéis sobrepostos abertos (diálogos e painéis laterais). Serve para:
 *  - Escape fechar só o que está por cima;
 *  - travar a rolagem da página enquanto houver algum aberto;
 *  - devolver o foco a quem abriu, na ordem certa.
 */
@Injectable({ providedIn: 'root' })
export class OverlayStackService {
  private readonly stack: object[] = [];

  push(owner: object): void {
    if (this.stack.includes(owner)) return;
    this.stack.push(owner);
    this.syncScroll();
  }

  pop(owner: object): void {
    const i = this.stack.indexOf(owner);
    if (i >= 0) this.stack.splice(i, 1);
    this.syncScroll();
  }

  isTop(owner: object): boolean {
    return this.stack[this.stack.length - 1] === owner;
  }

  private syncScroll(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('overlay-open', this.stack.length > 0);
  }
}
