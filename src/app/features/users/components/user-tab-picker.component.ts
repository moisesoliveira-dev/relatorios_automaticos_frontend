import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';

@Component({
  selector: 'app-user-tab-picker',
  standalone: true,
  template: `
    <div>
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="form-label mb-0">O que pode abrir</span>
        <div class="flex gap-1">
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.selectAllTabs()">Tudo</button>
          <button type="button" class="btn btn-ghost btn-sm" (click)="facade.deselectAllTabs()">Nada</button>
        </div>
      </div>
      <div class="picker">
        @for (node of facade.tabTree; track node.key) {
          <label class="pick-row">
            <input type="checkbox" [checked]="facade.isParentChecked(node)" [indeterminate]="facade.isParentIndeterminate(node)" (change)="facade.toggleParent(node)" />
            <span class="font-medium">{{ node.label }}</span>
          </label>
          @if (node.children?.length) {
            <div class="pick-children">
              @for (child of node.children; track child.key) {
                <label class="pick-row pick-child">
                  <input type="checkbox" [checked]="facade.isTabSelected(child.key)" (change)="facade.toggleTab(child.key, node)" />
                  <span>{{ child.label }}</span>
                </label>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .picker { border: 1px solid var(--cmm-border); border-radius: .85rem; background: var(--cmm-surface); padding: .5rem .75rem; max-height: 18rem; overflow-y: auto; }
    .pick-row { display: flex; align-items: center; gap: .6rem; padding: .35rem 0; font-size: .875rem; cursor: pointer; }
    .pick-row input { width: 1rem; height: 1rem; }
    .pick-children { margin-left: 1.6rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
    .pick-child { color: var(--cmm-muted); }
  `],
})
export class UserTabPickerComponent {
  readonly facade = inject(UsersFacade);
}
