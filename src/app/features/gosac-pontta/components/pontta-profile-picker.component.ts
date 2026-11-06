import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ToastService } from '../../../core/ui/toast.service';
import { IconComponent } from '../../../shared/components/icon.component';

export interface PonttaPerfil {
  id: string;
  cooperatorId?: string;
  name: string;
  email?: string;
}

/**
 * Busca um perfil (cooperador) no Pontta e devolve o escolhido. Usado nos dois rodízios para não
 * repetir a mesma lista de resultados em cada tela.
 */
@Component({
  selector: 'app-pontta-profile-picker',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">
      <label class="form-label" for="ppp-q">{{ rotulo() }}</label>
      <form class="search-field" (ngSubmit)="buscar()">
        <app-icon name="busca" [size]="16" />
        <input id="ppp-q" type="search" class="form-input" [(ngModel)]="query" name="q" placeholder="Nome da pessoa no Pontta e Enter" autocomplete="off" />
      </form>

      @if (buscando()) {
        <div class="loading-block py-3"><span class="spinner spinner-sm"></span> Buscando…</div>
      } @else if (resultados().length) {
        <ul class="res">
          @for (p of resultados(); track p.id) {
            <li>
              <button type="button" class="res-item" [class.res-on]="idDe(p) === selecionadoId()" (click)="escolher(p)" [attr.aria-pressed]="idDe(p) === selecionadoId()">
                <span class="res-av">{{ (p.name || '?').slice(0, 1).toUpperCase() }}</span>
                <span class="min-w-0 flex-1"><span class="block text-sm font-medium truncate">{{ p.name }}</span><span class="block text-xs truncate" style="color: var(--cmm-muted);">{{ p.email || 'Sem e-mail' }}</span></span>
                @if (idDe(p) === selecionadoId()) { <app-icon name="check" [size]="16" style="color: var(--cmm-accent);" /> }
              </button>
            </li>
          }
        </ul>
      } @else if (selecionadoId()) {
        <p class="note note-accent text-sm"><b>{{ selecionadoNome() || 'Perfil selecionado' }}</b> <span class="font-mono text-xs" style="color: var(--cmm-muted);">· {{ selecionadoId() }}</span></p>
      }
    </div>
  `,
  styles: [`
    .res { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; max-height: 14rem; overflow-y: auto; }
    .res-item { display: flex; align-items: center; gap: .65rem; width: 100%; text-align: left; padding: .5rem .65rem; border: 1px solid var(--cmm-border); border-radius: .75rem; background: var(--cmm-panel); color: var(--cmm-ink); cursor: pointer; transition: border-color 160ms, background-color 160ms; }
    .res-item:hover { border-color: color-mix(in srgb, var(--cmm-accent) 45%, var(--cmm-border)); }
    .res-on { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .res-av { flex-shrink: 0; width: 2rem; height: 2rem; border-radius: 99px; display: grid; place-items: center; font-size: .75rem; font-weight: 700; background: color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel)); }
    .res-on .res-av { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
  `],
})
export class PonttaProfilePickerComponent {
  private readonly toast = inject(ToastService);

  rotulo = input('Perfil no Pontta');
  buscarFn = input.required<(q: string) => Observable<PonttaPerfil[]>>();
  selecionadoId = input<string>('');
  selecionadoNome = input<string>('');
  escolhido = output<PonttaPerfil>();

  query = '';
  buscando = signal(false);
  resultados = signal<PonttaPerfil[]>([]);

  idDe(p: PonttaPerfil): string { return p.cooperatorId || p.id; }

  buscar(): void {
    const q = this.query.trim();
    if (!q) return;
    this.buscando.set(true);
    this.buscarFn()(q).subscribe({
      next: (r) => {
        this.resultados.set(r || []);
        this.buscando.set(false);
        if (!r?.length) this.toast.warning('Nenhum perfil encontrado no Pontta.');
      },
      error: (e) => { this.buscando.set(false); this.toast.error(e?.error?.message || 'Não foi possível buscar no Pontta.'); },
    });
  }

  escolher(p: PonttaPerfil): void {
    this.escolhido.emit(p);
    this.resultados.set([]);
  }

  limpar(): void { this.query = ''; this.resultados.set([]); }
}
