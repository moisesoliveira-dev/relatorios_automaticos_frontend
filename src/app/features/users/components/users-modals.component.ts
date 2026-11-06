import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersFacade } from '../facade/users.facade';
import { UserTabPickerComponent } from './user-tab-picker.component';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-users-modals',
  standalone: true,
  imports: [FormsModule, UserTabPickerComponent, DialogComponent, IconComponent],
  template: `
    <!-- Cadastrar -->
    <app-dialog [open]="facade.showCreateModal()" title="Cadastrar pessoa" subtitle="Cria o acesso com senha definida por você." [closable]="!facade.isLoading()" (closed)="facade.closeCreateModal()">
      <form id="form-create" (ngSubmit)="facade.createUser()" class="space-y-4">
        @if (facade.createError()) { <p class="note note-error" role="alert">{{ facade.createError() }}</p> }
        <div>
          <label class="form-label" for="cu-name">Nome</label>
          <input id="cu-name" type="text" [(ngModel)]="facade.createData.name" name="createName" required class="form-input" autocomplete="off" />
        </div>
        <div>
          <label class="form-label" for="cu-email">E-mail</label>
          <input id="cu-email" type="email" [(ngModel)]="facade.createData.email" name="createEmail" required class="form-input" autocomplete="off" />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label" for="cu-pw">Senha</label>
            <input id="cu-pw" type="password" [(ngModel)]="facade.createData.password" name="createPassword" required minlength="8" class="form-input" autocomplete="new-password" />
          </div>
          <div>
            <label class="form-label" for="cu-pw2">Confirmar senha</label>
            <input id="cu-pw2" type="password" [(ngModel)]="facade.createData.confirmPassword" name="createConfirmPassword" required minlength="8" class="form-input" autocomplete="new-password" />
          </div>
        </div>
        <app-user-tab-picker />
      </form>
      <ng-container dialog-footer>
        <button type="button" (click)="facade.closeCreateModal()" class="btn btn-secondary" [disabled]="facade.isLoading()">Cancelar</button>
        <button type="submit" form="form-create" [disabled]="facade.isLoading()" class="btn btn-primary">{{ facade.isLoading() ? 'Cadastrando…' : 'Cadastrar' }}</button>
      </ng-container>
    </app-dialog>

    <!-- Convidar -->
    <app-dialog [open]="facade.showInviteModal()" title="Convidar pessoa" subtitle="A pessoa recebe um link e cria a própria senha." [closable]="!facade.isLoading()" (closed)="facade.closeInviteModal()">
      @if (facade.inviteSuccess()) {
        <div class="space-y-4">
          @if (facade.inviteEmailSent()) {
            <p class="note note-ok">Convite enviado por e-mail. O link também foi copiado.</p>
          } @else {
            <p class="note note-warn">O e-mail não foi entregue. Compartilhe o link ou o código abaixo.</p>
            @if (facade.inviteCodeResult()) { <p class="font-display text-2xl font-bold tracking-widest text-center">{{ facade.inviteCodeResult() }}</p> }
          }
          <div class="flex items-center gap-2">
            <p class="note text-xs break-all flex-1 font-mono">{{ facade.inviteLink() }}</p>
            <button type="button" class="icon-btn icon-btn-outline" (click)="copiar(facade.inviteLink())" aria-label="Copiar link" title="Copiar link"><app-icon name="copiar" [size]="16" /></button>
          </div>
        </div>
      } @else {
        <form id="form-invite" (ngSubmit)="facade.sendInvite()" class="space-y-4">
          @if (facade.inviteError()) { <p class="note note-error" role="alert">{{ facade.inviteError() }}</p> }
          <div>
            <label class="form-label" for="inv-email">E-mail</label>
            <input id="inv-email" type="email" [(ngModel)]="facade.inviteEmail" name="email" required class="form-input" autocomplete="off" />
          </div>
          <app-user-tab-picker />
        </form>
      }
      <ng-container dialog-footer>
        @if (facade.inviteSuccess()) {
          <button type="button" (click)="facade.closeInviteModal()" class="btn btn-primary">Fechar</button>
        } @else {
          <button type="button" (click)="facade.closeInviteModal()" class="btn btn-secondary" [disabled]="facade.isLoading()">Cancelar</button>
          <button type="submit" form="form-invite" [disabled]="facade.isLoading()" class="btn btn-primary">{{ facade.isLoading() ? 'Enviando…' : 'Enviar convite' }}</button>
        }
      </ng-container>
    </app-dialog>

    <!-- Editar -->
    <app-dialog [open]="facade.showEditModal()" title="Editar pessoa" [subtitle]="facade.editData.email" [closable]="!facade.isLoading()" (closed)="facade.closeEditModal()">
      <form id="form-edit" (ngSubmit)="facade.saveUser()" class="space-y-4">
        @if (facade.editError()) { <p class="note note-error" role="alert">{{ facade.editError() }}</p> }
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label" for="ed-name">Nome</label>
            <input id="ed-name" type="text" [(ngModel)]="facade.editData.name" name="name" required class="form-input" />
          </div>
          <div>
            <label class="form-label" for="ed-status">Situação</label>
            <select id="ed-status" [(ngModel)]="facade.editData.status" name="status" class="form-input">
              <option value="active">Ativa</option>
              <option value="inactive">Inativa</option>
            </select>
          </div>
        </div>
        <app-user-tab-picker />
        @if (facade.isMaster()) {
          <details class="adv">
            <summary><app-icon name="cadeado" [size]="14" /> Definir nova senha</summary>
            <div class="grid sm:grid-cols-2 gap-3">
              <input type="password" [(ngModel)]="facade.editData.password" name="password" class="form-input" minlength="8" autocomplete="new-password" placeholder="Nova senha" aria-label="Nova senha" />
              <input type="password" [(ngModel)]="facade.editData.confirmPassword" name="confirmPassword" class="form-input" minlength="8" autocomplete="new-password" placeholder="Confirmar senha" aria-label="Confirmar senha" />
            </div>
          </details>
        }
      </form>
      <ng-container dialog-footer>
        <button type="button" (click)="facade.closeEditModal()" class="btn btn-secondary" [disabled]="facade.isLoading()">Cancelar</button>
        <button type="submit" form="form-edit" [disabled]="facade.isLoading()" class="btn btn-primary">{{ facade.isLoading() ? 'Salvando…' : 'Salvar' }}</button>
      </ng-container>
    </app-dialog>

    <!-- Aprovar cadastro -->
    <app-dialog [open]="facade.showApproveModal()" title="Aprovar cadastro" [subtitle]="facade.approvingUser() ? 'Escolha o que ' + (facade.approvingUser()!.name || facade.approvingUser()!.email) + ' pode abrir.' : ''" [closable]="!facade.isLoading()" (closed)="facade.closeApproveModal()">
      @if (facade.approveError()) { <p class="note note-error mb-4" role="alert">{{ facade.approveError() }}</p> }
      <app-user-tab-picker />
      <ng-container dialog-footer>
        <button type="button" (click)="facade.closeApproveModal()" class="btn btn-secondary" [disabled]="facade.isLoading()">Cancelar</button>
        <button type="button" (click)="facade.confirmApproveRegistration()" [disabled]="facade.isLoading()" class="btn btn-accent">{{ facade.isLoading() ? 'Aprovando…' : 'Aprovar' }}</button>
      </ng-container>
    </app-dialog>
  `,
})
export class UsersModalsComponent {
  readonly facade = inject(UsersFacade);

  copiar(texto: string): void {
    void navigator.clipboard.writeText(texto);
  }
}
