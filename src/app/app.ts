import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class App implements OnInit, OnDestroy {
  private checkInterval: any;

  constructor(private authService: AuthService) { }

  ngOnInit() {
    // Verifica inatividade a cada 30 segundos quando a página está visível
    this.checkInterval = setInterval(() => {
      if (!document.hidden) {
        // Só verifica se a página está visível
        this.authService.checkInactivity();
      }
    }, 30000); // 30 segundos
  }

  ngOnDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
}
