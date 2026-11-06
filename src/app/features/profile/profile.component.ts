import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/ui/toast.service';
import { DialogComponent } from '../../shared/components/dialog.component';
import { IconComponent } from '../../shared/components/icon.component';

/**
 * Meu perfil: um cartão de identidade com o nome editável em linha e a troca de senha numa janela.
 * Sem painéis repetidos: o que a pessoa precisa aqui é trocar o nome ou a senha, e só.
 */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Meu perfil</h1>
          <p class="page-subtitle">Seu nome, seu acesso e sua senha.</p>
        </div>
      </div>

      <div class="panel panel-pad">
        <div class="flex items-center gap-5">
          <div class="avatar-xl font-display">{{ authService.userInitials() }}</div>
          <div class="flex-1 min-w-0">
            <h2 class="font-display text-xl font-bold truncate">{{ authService.user()?.name }}</h2>
            <p class="text-sm truncate" style="color: var(--cmm-muted);">{{ authService.user()?.email }}</p>
          </div>
        </div>

        <dl class="kv mt-5">
          <div>
            <dt>Nome</dt>
            <dd>
              @if (editandoNome()) {
                <form class="flex items-center gap-2" (ngSubmit)="salvarNome()">
                  <input class="form-input !min-h-9 !py-1" name="name" [(ngModel)]="novoNome" autocomplete="name" required minlength="2" aria-label="Novo nome" autofocus />
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="salvandoNome()">{{ salvandoNome() ? 'Salvando…' : 'Salvar' }}</button>
                  <button type="button" class="icon-btn icon-btn-sm" (click)="editandoNome.set(false)" aria-label="Cancelar"><app-icon name="fechar" [size]="16" /></button>
                </form>
              } @else {
                <span class="inline-flex items-center gap-2">{{ authService.user()?.name }}
                  <button type="button" class="icon-btn icon-btn-sm" (click)="comecarEditarNome()" aria-label="Editar nome" title="Editar nome"><app-icon name="lapis" [size]="15" /></button>
                </span>
              }
            </dd>
          </div>
          <div><dt>Perfil de acesso</dt><dd>{{ roleLabel() }}</dd></div>
          <div><dt>Membro desde</dt><dd>{{ formatDate(authService.user()?.createdAt) }}</dd></div>
          <div>
            <dt>Senha</dt>
            <dd><button type="button" class="btn btn-secondary btn-sm" (click)="abrirSenha()"><app-icon name="cadeado" [size]="15" />Alterar senha</button></dd>
          </div>
        </dl>
      </div>
    </div>

    <app-dialog [open]="senhaAberta()" title="Alterar senha" subtitle="Mínimo de 8 caracteres." size="sm" [closable]="!salvandoSenha()" (closed)="senhaAberta.set(false)">
      <form id="form-senha" class="space-y-4" (ngSubmit)="salvarSenha()">
        @if (erroSenha()) { <p class="note note-error" role="alert">{{ erroSenha() }}</p> }
        <div>
          <label class="form-label" for="pw-atual">Senha atual</label>
          <input id="pw-atual" type="password" class="form-input" name="currentPassword" [(ngModel)]="senhaAtual" autocomplete="current-password" required />
        </div>
        <div>
          <label class="form-label" for="pw-nova">Nova senha</label>
          <input id="pw-nova" type="password" class="form-input" name="newPassword" [(ngModel)]="senhaNova" autocomplete="new-password" minlength="8" required />
        </div>
        <div>
          <label class="form-label" for="pw-conf">Repita a nova senha</label>
          <input id="pw-conf" type="password" class="form-input" name="confirmNewPassword" [(ngModel)]="senhaConfirma" autocomplete="new-password" required />
        </div>
      </form>
      <ng-container dialog-footer>
        <button type="button" class="btn btn-secondary" (click)="senhaAberta.set(false)" [disabled]="salvandoSenha()">Cancelar</button>
        <button type="submit" form="form-senha" class="btn btn-primary" [disabled]="salvandoSenha()">{{ salvandoSenha() ? 'Alterando…' : 'Alterar senha' }}</button>
      </ng-container>
    </app-dialog>
  `,
  styles: [`
    .avatar-xl { width: 4.5rem; height: 4.5rem; border-radius: 1.1rem; display: grid; place-items: center; font-size: 1.5rem; font-weight: 800; color: var(--cmm-accent-ink); background: linear-gradient(135deg, var(--cmm-accent), var(--cmm-accent-2)); box-shadow: 0 12px 30px -12px var(--cmm-accent); flex-shrink: 0; }
    .kv dd { font-weight: 500; }
  `],
})
export class ProfileComponent {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private apiUrl = environment.apiUrl;

  editandoNome = signal(false);
  salvandoNome = signal(false);
  novoNome = '';

  senhaAberta = signal(false);
  salvandoSenha = signal(false);
  erroSenha = signal('');
  senhaAtual = '';
  senhaNova = '';
  senhaConfirma = '';

  roleLabel(): string {
    switch (this.authService.user()?.role) {
      case 'master': return 'Master';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      default: return 'Usuário';
    }
  }

  formatDate(date?: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  comecarEditarNome(): void {
    this.novoNome = this.authService.user()?.name || '';
    this.editandoNome.set(true);
  }

  salvarNome(): void {
    const nome = this.novoNome.trim();
    if (nome.length < 2) { this.toast.warning('O nome precisa ter pelo menos 2 caracteres.'); return; }
    this.salvandoNome.set(true);
    this.http.patch(`${this.apiUrl}/users/profile/name`, { name: nome }).subscribe({
      next: () => {
        this.salvandoNome.set(false);
        this.editandoNome.set(false);
        this.authService.updateUserName(nome);
        this.toast.success('Nome atualizado.');
      },
      error: (error) => {
        this.salvandoNome.set(false);
        this.toast.error(error.error?.message || 'Não foi possível atualizar o nome.');
      },
    });
  }

  abrirSenha(): void {
    this.senhaAtual = this.senhaNova = this.senhaConfirma = '';
    this.erroSenha.set('');
    this.senhaAberta.set(true);
  }

  salvarSenha(): void {
    if (!this.senhaAtual || !this.senhaNova || !this.senhaConfirma) { this.erroSenha.set('Preencha os três campos.'); return; }
    if (this.senhaNova.length < 8) { this.erroSenha.set('A nova senha precisa ter pelo menos 8 caracteres.'); return; }
    if (this.senhaNova !== this.senhaConfirma) { this.erroSenha.set('As senhas não conferem.'); return; }
    this.erroSenha.set('');
    this.salvandoSenha.set(true);
    this.http.patch(`${this.apiUrl}/users/profile/password`, { currentPassword: this.senhaAtual, newPassword: this.senhaNova }).subscribe({
      next: () => {
        this.salvandoSenha.set(false);
        this.senhaAberta.set(false);
        this.toast.success('Senha alterada.');
      },
      error: (error) => {
        this.salvandoSenha.set(false);
        this.erroSenha.set(error.error?.message || 'Não foi possível alterar a senha.');
      },
    });
  }
}
