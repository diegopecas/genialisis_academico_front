import { Injectable, signal } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  public isLoading = signal(false);

  // Temporizador del fade-out: retrasa el ocultado real del overlay el
  // tiempo que dura la animación de opacidad (300 ms), para que el spinner
  // se desvanezca en vez de cortarse de golpe.
  private hideTimer: any = null;

  constructor(private spinner: NgxSpinnerService) {}

  show() {
    // Si había un fade-out pendiente, cancelarlo: llegó una nueva petición
    // antes de terminar el desvanecido y el spinner debe seguir visible.
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.isLoading.set(true);
    this.spinner.show();
  }

  hide() {
    // isLoading -> false dispara el fade-out (opacidad) en el template.
    this.isLoading.set(false);
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    // Ocultar el overlay cuando termine la animación de desvanecido.
    this.hideTimer = setTimeout(() => {
      this.spinner.hide();
      this.hideTimer = null;
    }, 300);
  }
}