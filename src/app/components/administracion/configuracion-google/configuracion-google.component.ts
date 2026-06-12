import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { GoogleConfiguracionService } from '../../../services/google-configuracion.service';
import { GoogleCalendarService } from '../../../services/google-calendar.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-google',
  templateUrl: './configuracion-google.component.html',
  styleUrl: './configuracion-google.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ConfiguracionGoogleComponent implements OnInit {

  titulo = "Configuración Google";
  public columnasFiltro = ['Clave', 'Descripción'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public googleConectado = false;

  constructor(
    private googleConfiguracionService: GoogleConfiguracionService,
    private googleCalendarService: GoogleCalendarService,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConfiguraciones();
    this.verificarConexionGoogle();

    // Detectar resultado del callback OAuth
    this.route.queryParams.subscribe(params => {
      if (params['google_calendar'] === 'ok') {
        Swal.fire({ icon: 'success', title: 'Conectado', text: params['message'] || 'Google Calendar conectado exitosamente', timer: 3000, showConfirmButton: false });
        this.obtenerConfiguraciones();
        this.verificarConexionGoogle();
      } else if (params['google_calendar'] === 'error') {
        Swal.fire({ icon: 'error', title: 'Error', text: params['message'] || 'No se pudo conectar Google Calendar' });
      }
    });
  }

  obtenerConfiguraciones() {
    this.googleConfiguracionService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
    });
  }

  verificarConexionGoogle() {
    this.googleCalendarService.verificarConexion().subscribe({
      next: (response: any) => {
        this.googleConectado = response.body?.conectado || false;
      }
    });
  }

  conectarGoogleCalendar() {
    this.googleCalendarService.obtenerUrlAutorizacion().subscribe({
      next: (response: any) => {
        const url = response.body?.url;
        if (url) {
          window.location.href = url;
        }
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar la URL de autorización' });
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'clave',
        alias: 'Clave',
        alinear: 'izquierda',
      },
      {
        clave: 'valor',
        alias: 'Valor',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/configuracion-google/editar/' + $event.registro.id]);
        break;
    }
  }
}