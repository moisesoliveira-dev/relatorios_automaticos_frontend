import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { MotionService } from './core/motion/motion.service';
import { DialogEnhancerService } from './core/ui/dialog-enhancer.service';
import { ResponsiveTablesService } from './core/ui/responsive-tables.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit, OnDestroy {
  private checkInterval: ReturnType<typeof setInterval> | undefined;
  private readonly motion = inject(MotionService);
  private readonly dialogs = inject(DialogEnhancerService);
  private readonly tables = inject(ResponsiveTablesService);

  constructor(private authService: AuthService) { }

  ngOnInit() {
    // Liga o motor de movimento (revelação em cascata, spotlight, magnetismo, progresso de rolagem...)
    this.motion.start();
    // Acessibilidade de todos os diálogos (foco preso, Escape, rótulos)
    this.dialogs.start();
    // Rotula as células das tabelas para a versão em cartões do celular
    this.tables.start();

    // Verifica inatividade a cada 15 segundos quando a página está visível
    this.checkInterval = setInterval(() => {
      if (!document.hidden) {
        this.authService.checkInactivity();
      }
    }, 15000);
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
