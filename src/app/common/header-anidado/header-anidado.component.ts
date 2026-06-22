import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';
import { AccesosRapidosService } from '../../services/accesos-rapidos.service';

@Component({
  selector: 'app-header-anidado',
  templateUrl: './header-anidado.component.html',
  styleUrl: './header-anidado.component.css',
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class HeaderComponentAnidado implements OnChanges, OnInit {

  @Input() tituloModulo: any;
  @Input() accion: any;
  @Input() id: any;
  @Input() idPrincipal: any;
  @Input() raiz: any;
  @Input() regresar: any;
  @Input() mostrarCrear: any;
  @Input() iconoTitulo: any;
  @Input() path: any;

  titulo = "";
  idRegistro = "0";
  pathRegresar = "";
  iconoCrear = false;
  icono = '';

  public createIcon = '+';
  public backIcon = '←';

  public logoGenialisis = '/assets/images/logo_app.png';
  public nombreJardin = '';

  public esTrackeable = false;
  public esFijado = false;
  private accesoId: string | null = null;
  private rutaActual = '';
  private labelAcceso = '';
  private iconoAcceso = '';

  constructor(
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
    private ayudaModalService: AyudaModalService,
    private accesosRapidosService: AccesosRapidosService
  ) {}

  ngOnInit(): void {
    this.nombreJardin = this.institucionConfigService.getNombreInstitucion();
    this.verificarRutaTrackeable();
  }

  abrirAyuda(): void {
    this.ayudaModalService.abrir();
  }

  togglePin(): void {
    if (this.accesoId) {
      const nuevoEstado = this.esFijado ? 0 : 1;
      this.accesosRapidosService.toggleFijo(this.accesoId, nuevoEstado).subscribe({
        next: () => {
          this.esFijado = !this.esFijado;
        }
      });
    } else {
      this.accesosRapidosService.fijarNuevo(this.rutaActual, this.labelAcceso, this.iconoAcceso).subscribe({
        next: (response: any) => {
          if (response.id) {
            this.accesoId = response.id;
          }
          this.esFijado = true;
        }
      });
    }
  }

  private verificarRutaTrackeable(): void {
    const url = this.router.url;
    const rutaLimpia = url.startsWith('/') ? url.substring(1) : url;
    this.rutaActual = rutaLimpia.split('?')[0];

    const rutasConfig = this.router.config;
    for (const ruta of rutasConfig) {
      if (ruta.path === this.rutaActual && ruta.data?.['trackear']) {
        this.esTrackeable = true;
        this.labelAcceso = ruta.data['labelAcceso'] || this.rutaActual;
        this.iconoAcceso = ruta.data['iconoAcceso'] || '📌';
        this.consultarEstadoFijado();
        break;
      }
    }
  }

  private consultarEstadoFijado(): void {
    const acceso = this.accesosRapidosService.getAccesoByRuta(this.rutaActual);
    if (acceso) {
      this.accesoId = acceso.id;
      this.esFijado = acceso.es_fijo === 1;
    }
  }

  capitalizarTitulo(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes["tituloModulo"]) {
      this.titulo = changes["tituloModulo"]["currentValue"];
    }

    if (changes["iconoTitulo"]) {
      this.icono = changes["iconoTitulo"]["currentValue"];
    }

    if (changes["mostrarCrear"]) {
      this.iconoCrear = changes["mostrarCrear"]["currentValue"];
    }

    if (changes["id"]) {
      this.idRegistro = changes["id"]["currentValue"];
    }

    if (changes["accion"]) {
      const _accion = changes["accion"]["currentValue"];
      switch(_accion) {
        case 'crear':
          this.titulo = "Crear " + this.titulo;
          break;
        case 'editar':
          this.titulo = "Editar " + this.titulo + ": " + this.idRegistro;
          break;
        case 'consultar':
          this.titulo = "Consultar " + this.titulo + ": " + this.idRegistro;
          break;
      }
    }

    if (changes["regresar"]) {
      this.pathRegresar = changes["regresar"]["currentValue"];
    }
  }
}