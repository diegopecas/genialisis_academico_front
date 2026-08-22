import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { NotificacionesColaboradoresDestinatariosService } from '../../../services/notificaciones-colaboradores-destinatarios.service';

@Component({
  selector: 'app-notificaciones-colaboradores',
  templateUrl: './notificaciones-colaboradores.component.html',
  styleUrl: './notificaciones-colaboradores.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class NotificacionesColaboradoresComponent implements OnInit {

  titulo = "Mis Alertas";

  public alertas = [] as any[];
  public cargando: boolean = false;
  public soloNoLeidas: boolean = false;

  // Tipos de notificacion a colaboradores (catalogo global). El id_referencia
  // apunta a una tabla distinta segun el tipo, por eso la navegacion se
  // resuelve aqui y no se guarda una ruta en base de datos.
  readonly TIPO_POR_APROBAR = 1;
  readonly TIPO_COMPROMISO_PROXIMO = 2;

  constructor(
    private destinatariosService: NotificacionesColaboradoresDestinatariosService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.destinatariosService.obtenerMias().subscribe({
      next: (response: any) => {
        this.alertas = response.body || [];
        this.cargando = false;
      },
      error: () => {
        this.alertas = [];
        this.cargando = false;
      }
    });
  }

  get listado(): any[] {
    return this.soloNoLeidas
      ? this.alertas.filter(a => !a.fecha_lectura)
      : this.alertas;
  }

  get totalNoLeidas(): number {
    return this.alertas.filter(a => !a.fecha_lectura).length;
  }

  abrir(alerta: any) {
    if (!alerta.fecha_lectura) {
      this.destinatariosService.marcarLeida({ id: alerta.id_destinatario }).subscribe({
        next: () => {
          alerta.fecha_lectura = new Date().toISOString();
        },
        error: () => { }
      });
    }

    this.navegar(alerta);
  }

  navegar(alerta: any) {
    if (alerta.id_tipo_notificacion_colaborador === this.TIPO_POR_APROBAR) {
      this.router.navigate(['/operaciones/aprobar-solicitudes']);
      return;
    }

    if (alerta.id_tipo_notificacion_colaborador === this.TIPO_COMPROMISO_PROXIMO) {
      this.router.navigate(['/operaciones/solicitudes-acudientes']);
      return;
    }
  }
}
