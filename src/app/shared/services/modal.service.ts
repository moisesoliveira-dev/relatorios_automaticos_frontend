import { Injectable, signal } from '@angular/core';

export interface ModalConfig {
    title: string;
    message: string;
    type: 'confirm' | 'alert' | 'success' | 'error' | 'warning';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private modalConfig = signal<ModalConfig | null>(null);

    readonly config = this.modalConfig.asReadonly();

    confirm(title: string, message: string, confirmText = 'Confirmar', cancelText = 'Cancelar'): Promise<boolean> {
        return new Promise((resolve) => {
            this.modalConfig.set({
                title,
                message,
                type: 'confirm',
                confirmText,
                cancelText,
                onConfirm: () => {
                    this.close();
                    resolve(true);
                },
                onCancel: () => {
                    this.close();
                    resolve(false);
                }
            });
        });
    }

    alert(title: string, message: string, type: 'success' | 'error' | 'warning' | 'alert' = 'alert'): Promise<void> {
        return new Promise((resolve) => {
            this.modalConfig.set({
                title,
                message,
                type,
                confirmText: 'OK',
                onConfirm: () => {
                    this.close();
                    resolve();
                }
            });
        });
    }

    success(message: string, title = 'Sucesso') {
        return this.alert(title, message, 'success');
    }

    error(message: string, title = 'Erro') {
        return this.alert(title, message, 'error');
    }

    warning(message: string, title = 'Atenção') {
        return this.alert(title, message, 'warning');
    }

    close() {
        this.modalConfig.set(null);
    }
}
