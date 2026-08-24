import { Injectable, inject, signal } from '@angular/core';
import {
  ALL_TAB_KEYS,
  TAB_TREE,
  TabNode,
  User,
  UserStatus,
} from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../shared/services/modal.service';
import { UsersApiService } from '../data/users-api.service';
import { UserInvite, UsersTab } from '../models/users.models';

/** Facade: orquestra API, estado e regras de UI da feature Usuários. */
@Injectable()
export class UsersFacade {
  private readonly api = inject(UsersApiService);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(ModalService);

  readonly tabTree = TAB_TREE;

  readonly users = signal<User[]>([]);
  readonly pendingInvites = signal<UserInvite[]>([]);
  readonly pendingRegistrations = signal<User[]>([]);
  readonly activeTab = signal<UsersTab>('users');
  readonly isLoading = signal(false);

  readonly showCreateModal = signal(false);
  readonly showInviteModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showApproveModal = signal(false);

  readonly editingUser = signal<User | null>(null);
  readonly approvingUser = signal<User | null>(null);

  readonly createError = signal('');
  readonly inviteError = signal('');
  readonly editError = signal('');
  readonly approveError = signal('');

  readonly inviteSuccess = signal(false);
  readonly inviteLink = signal('');
  readonly inviteEmailSent = signal(true);
  readonly inviteEmailError = signal('');
  readonly inviteCodeResult = signal('');

  readonly selectedTabs = signal<string[]>([]);

  inviteEmail = '';
  createData = { name: '', email: '', password: '', confirmPassword: '' };
  editData = { name: '', email: '', status: 'active' as UserStatus, password: '', confirmPassword: '' };

  init(): void {
    this.loadUsers();
    if (this.canManageUsers()) {
      this.loadPendingInvites();
      this.loadPendingRegistrations();
    }
  }

  canManageUsers(): boolean {
    const user = this.authService.user();
    const role = user?.role;
    return role === 'master' || role === 'admin' || (user?.tabs || []).includes('usuarios');
  }

  isMaster(): boolean {
    return this.authService.user()?.role === 'master';
  }

  isTabSelected(key: string): boolean {
    return this.selectedTabs().includes(key);
  }

  isParentChecked(node: TabNode): boolean {
    if (!node.children?.length) return this.isTabSelected(node.key);
    return node.children.every((child) => this.isTabSelected(child.key));
  }

  isParentIndeterminate(node: TabNode): boolean {
    if (!node.children?.length) return false;
    const selectedCount = node.children.filter((child) => this.isTabSelected(child.key)).length;
    return selectedCount > 0 && selectedCount < node.children.length;
  }

  toggleTab(key: string, parent?: TabNode): void {
    const next = new Set(this.selectedTabs());
    if (next.has(key)) next.delete(key);
    else next.add(key);

    if (parent?.children?.length) {
      const allChildren = parent.children.every((child) => next.has(child.key));
      if (allChildren) next.add(parent.key);
      else next.delete(parent.key);
    }
    this.selectedTabs.set([...next]);
  }

  toggleParent(node: TabNode): void {
    const next = new Set(this.selectedTabs());
    const childKeys = node.children?.map((c) => c.key) ?? [];

    if (childKeys.length) {
      const allSelected = childKeys.every((k) => next.has(k));
      if (allSelected) {
        next.delete(node.key);
        childKeys.forEach((k) => next.delete(k));
      } else {
        next.add(node.key);
        childKeys.forEach((k) => next.add(k));
      }
    } else if (next.has(node.key)) {
      next.delete(node.key);
    } else {
      next.add(node.key);
    }
    this.selectedTabs.set([...next]);
  }

  selectAllTabs(): void {
    this.selectedTabs.set([...ALL_TAB_KEYS]);
  }

  deselectAllTabs(): void {
    this.selectedTabs.set([]);
  }

  formatTabsSummary(tabs?: string[] | null): string {
    const labels = this.getTopLevelTabLabels(tabs);
    if (!labels.length) return 'Sem acesso';
    if (labels.length <= 3) return labels.join(', ');
    return `${labels.length} abas`;
  }

  getTopLevelTabLabels(tabs?: string[] | null): string[] {
    if (!tabs?.length) return [];
    const set = new Set(tabs);
    return TAB_TREE.filter((node) => {
      if (set.has(node.key)) return true;
      return !!node.children?.some((child) => set.has(child.key));
    }).map((node) => node.label);
  }

  loadUsers(): void {
    this.api.list().subscribe({
      next: (users) => this.users.set(users),
      error: (err) => console.error('Erro ao carregar usuários:', err),
    });
  }

  loadPendingInvites(): void {
    this.api.listPendingInvites().subscribe({
      next: (invites) => this.pendingInvites.set(invites),
      error: (err) => console.error('Erro ao carregar convites:', err),
    });
  }

  loadPendingRegistrations(): void {
    this.api.listPendingRegistrations().subscribe({
      next: (users) => this.pendingRegistrations.set(users),
      error: (err) => console.error('Erro ao carregar cadastros pendentes:', err),
    });
  }

  openCreateModal(): void {
    this.createData = { name: '', email: '', password: '', confirmPassword: '' };
    this.selectedTabs.set([]);
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createError.set('');
    this.selectedTabs.set([]);
  }

  createUser(): void {
    const { name: rawName, email: rawEmail, password, confirmPassword } = this.createData;
    const name = rawName.trim();
    const email = rawEmail.trim();

    if (!name || name.length < 2) {
      this.createError.set('Informe o nome (mínimo 2 caracteres)');
      return;
    }
    if (!email) {
      this.createError.set('Informe o email');
      return;
    }
    if (!password || password.length < 6) {
      this.createError.set('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      this.createError.set('As senhas não coincidem');
      return;
    }

    const tabs = this.selectedTabs();
    if (!tabs.length) {
      this.createError.set('Selecione ao menos uma aba');
      return;
    }

    this.isLoading.set(true);
    this.createError.set('');
    this.api.create({ name, email, password, tabs }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeCreateModal();
        this.loadUsers();
        this.activeTab.set('users');
        this.modalService.success('Usuário cadastrado com sucesso!');
      },
      error: (err) => {
        this.createError.set(err.error?.message || 'Erro ao cadastrar usuário');
        this.isLoading.set(false);
      },
    });
  }

  openInviteModal(): void {
    this.inviteEmail = '';
    this.selectedTabs.set([]);
    this.inviteSuccess.set(false);
    this.inviteError.set('');
    this.inviteLink.set('');
    this.showInviteModal.set(true);
  }

  closeInviteModal(): void {
    this.showInviteModal.set(false);
    if (this.inviteSuccess()) this.loadPendingInvites();
  }

  sendInvite(): void {
    if (!this.inviteEmail) {
      this.inviteError.set('Informe o email');
      return;
    }
    const tabs = this.selectedTabs();
    if (!tabs.length) {
      this.inviteError.set('Selecione ao menos uma aba');
      return;
    }

    this.isLoading.set(true);
    this.inviteError.set('');
    this.api.sendInvite(this.inviteEmail, tabs).subscribe({
      next: (response) => {
        this.inviteLink.set(response.inviteLink);
        this.inviteEmailSent.set(response.emailSent !== false);
        this.inviteEmailError.set(response.emailError || '');
        this.inviteCodeResult.set(response.inviteCode || '');
        this.inviteSuccess.set(true);
        this.isLoading.set(false);
        navigator.clipboard.writeText(response.inviteLink);
      },
      error: (err) => {
        this.inviteError.set(err.error?.message || 'Erro ao enviar convite');
        this.isLoading.set(false);
      },
    });
  }

  copyInviteLink(_invite: UserInvite): void {
    navigator.clipboard.writeText(`${window.location.origin}/invite`);
    this.modalService.success('Link copiado para a área de transferência!', 'Sucesso');
  }

  async cancelInvite(invite: UserInvite): Promise<void> {
    const confirmed = await this.modalService.confirm(
      'Cancelar Convite',
      `Tem certeza que deseja cancelar o convite para "${invite.email}"?`,
      'Sim, cancelar',
      'Não',
    );
    if (!confirmed) return;

    this.api.cancelInvite(invite.id).subscribe({
      next: () => {
        this.loadPendingInvites();
        this.modalService.success('Convite cancelado com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao cancelar convite:', err);
        this.modalService.error(err.error?.message || 'Erro ao cancelar convite');
      },
    });
  }

  editUser(user: User): void {
    if (user.role === 'master') {
      this.modalService.warning('O usuário master não pode ser editado');
      return;
    }
    this.editingUser.set(user);
    this.editData = {
      name: user.name,
      email: user.email,
      status: user.status || 'active',
      password: '',
      confirmPassword: '',
    };
    this.selectedTabs.set([...(user.tabs || [])]);
    this.editError.set('');
    this.showEditModal.set(true);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingUser.set(null);
    this.editError.set('');
    this.selectedTabs.set([]);
  }

  saveUser(): void {
    const editing = this.editingUser();
    if (!editing) return;

    const tabs = this.selectedTabs();
    if (!tabs.length) {
      this.editError.set('Selecione ao menos uma aba');
      return;
    }

    const password = this.editData.password.trim();
    const confirmPassword = this.editData.confirmPassword.trim();

    if (this.isMaster() && (password || confirmPassword)) {
      if (password.length < 6) {
        this.editError.set('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (password !== confirmPassword) {
        this.editError.set('As senhas não conferem');
        return;
      }
    }

    this.isLoading.set(true);
    this.editError.set('');

    const payload: Record<string, unknown> = {
      name: this.editData.name,
      status: this.editData.status,
      isActive: this.editData.status === 'active',
      tabs,
    };
    if (this.isMaster() && password) payload['password'] = password;

    this.api.update(editing.id, payload).subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditModal();
        this.isLoading.set(false);
        this.modalService.success(
          password ? 'Usuário e senha atualizados com sucesso!' : 'Usuário atualizado com sucesso!',
        );
      },
      error: (err) => {
        console.error('Erro ao atualizar:', err);
        this.editError.set(err.error?.message || 'Erro ao atualizar usuário');
        this.isLoading.set(false);
      },
    });
  }

  async deleteUser(user: User): Promise<void> {
    if (user.role === 'master') {
      this.modalService.warning('O usuário master não pode ser excluído');
      return;
    }
    const confirmed = await this.modalService.confirm(
      'Excluir Usuário',
      `Tem certeza que deseja excluir o usuário "${user.name}"?`,
      'Sim, excluir',
      'Cancelar',
    );
    if (!confirmed) return;

    this.api.delete(user.id).subscribe({
      next: () => {
        this.loadUsers();
        this.modalService.success('Usuário excluído com sucesso!');
      },
      error: (err) => {
        console.error('Erro ao excluir:', err);
        this.modalService.error(err.error?.message || 'Erro ao excluir usuário');
      },
    });
  }

  openApproveModal(user: User): void {
    this.approvingUser.set(user);
    this.selectedTabs.set([...(user.tabs || [])]);
    this.approveError.set('');
    this.showApproveModal.set(true);
  }

  closeApproveModal(): void {
    this.showApproveModal.set(false);
    this.approvingUser.set(null);
    this.approveError.set('');
    this.selectedTabs.set([]);
  }

  confirmApproveRegistration(): void {
    const user = this.approvingUser();
    if (!user) return;

    const tabs = this.selectedTabs();
    if (!tabs.length) {
      this.approveError.set('Selecione ao menos uma aba');
      return;
    }

    this.isLoading.set(true);
    this.approveError.set('');
    this.api.approveRegistration(user.id, tabs).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.closeApproveModal();
        this.loadPendingRegistrations();
        this.loadUsers();
        this.modalService.success(`Usuário "${user.name || user.email}" aprovado com sucesso!`);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.approveError.set(err.error?.message || 'Erro ao aprovar usuário');
      },
    });
  }

  async rejectRegistration(user: User): Promise<void> {
    const confirmed = await this.modalService.confirm(
      'Rejeitar Cadastro',
      `Deseja rejeitar o cadastro de "${user.name || user.email}"?`,
      'Sim, rejeitar',
      'Cancelar',
    );
    if (!confirmed) return;

    this.api.rejectRegistration(user.id).subscribe({
      next: () => {
        this.loadPendingRegistrations();
        this.modalService.success('Cadastro rejeitado.');
      },
      error: (err) => {
        this.modalService.error(err.error?.message || 'Erro ao rejeitar cadastro');
      },
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getStatusLabel(status?: UserStatus): string {
    if (!status) return 'Ativo';
    const labels: Record<UserStatus, string> = {
      pending: 'Pendente',
      active: 'Ativo',
      inactive: 'Inativo',
    };
    return labels[status] || status;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
