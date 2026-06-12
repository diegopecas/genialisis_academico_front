import { Component, OnInit, ViewChild, ElementRef, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InstitucionConfigService } from './services/institucion-config.service';
import { Title } from '@angular/platform-browser';
import { NgxSpinnerModule } from 'ngx-spinner';
import { IaChatFloatingComponent } from './widgets/ia-chat-floating/ia-chat-floating.component';
import { WaChatFloatingComponent } from './widgets/wa-chat-floating/wa-chat-floating.component';
import { AyudaComponent } from './common/ayuda/ayuda.component';
import { PushNotificationService } from './services/push-notification.service';
import { SpinnerService } from './services/spinner.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgxSpinnerModule, IaChatFloatingComponent, WaChatFloatingComponent, AyudaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'SIA';

  // Referencia al video del spinner para reiniciarlo cada vez que se muestra.
  @ViewChild('spinnerVideo') spinnerVideo?: ElementRef<HTMLVideoElement>;

  // Estado de carga expuesto al template para el fade-out del spinner.
  get loading() { return this.spinnerService.isLoading(); }

  constructor(
    private institucionConfigService: InstitucionConfigService,
    private titleService: Title,
    private pushService: PushNotificationService,
    private spinnerService: SpinnerService
  ) {
    // ngx-spinner solo oculta el spinner (no lo destruye), por lo que el video
    // queda pausado en un frame. Al volver a mostrarse (isLoading -> true) lo
    // reiniciamos desde el inicio para que siempre se vea animado.
    effect(() => {
      if (this.spinnerService.isLoading()) {
        const video = this.spinnerVideo?.nativeElement;
        if (video) {
          video.currentTime = 0;
          video.play().catch(() => { /* autoplay bloqueado: el poster sirve de respaldo */ });
        }
      }
    });
  }

  ngOnInit() {
    const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    this.title = `Genialisis ${nombreInstitucion}`;
    this.titleService.setTitle(this.title);

    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      this.pushService.inicializar();
    }
  }
}