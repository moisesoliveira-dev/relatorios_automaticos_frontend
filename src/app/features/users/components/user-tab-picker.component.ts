import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';

@Component({
  selector: 'app-user-tab-picker',
  standalone: true,
  template: `
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="form-label mb-0">Abas de acesso</label>
        <div class="flex gap-2">
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.selectAllTabs()">Selecionar todas</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.deselectAllTabs()">Limpar</button>
        </div>
      </div>
      <div
        class="rounded-lg p-3 space-y-1"
        style="background: var(--cmm-surface); border: 1px solid var(--cmm-border); max-height: 280px; overflow-y: auto;"
      >
        @for (node of facade.tabTree; track node.key) {
          <div>
            <label class="flex items-center gap-2 py-1 cursor-pointer text-sm" style="color: var(--cmm-ink);">
              <input
                type="checkbox"
                class="form-checkbox"
                [checked]="facade.isParentChecked(node)"
                [indeterminate]="facade.isParentIndeterminate(node)"
                (change)="facade.toggleParent(node)"
              />
              <span class="font-medium">{{ node.label }}</span>
            </label>
            @if (node.children?.length) {
              <div class="ml-6 space-y-1">
                @for (child of node.children; track child.key) {
                  <label class="flex items-center gap-2 py-1 cursor-pointer text-sm" style="color: var(--cmm-muted);">
                    <input
                      type="checkbox"
                      class="form-checkbox"
                      [checked]="facade.isTabSelected(child.key)"
                      (change)="facade.toggleTab(child.key, node)"
                    />
                    <span>{{ child.label }}</span>
                  </label>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class UserTabPickerComponent {
  readonly facade = inject(UsersFacade);
}
