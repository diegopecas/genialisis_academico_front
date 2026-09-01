import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AutorizacionesInformesEstudiantesService } from '../../../services/autorizaciones-informes-estudiantes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-autorizacion-informes',
  templateUrl: './autorizacion-informes.component.html',
  styleUrl: './autorizacion-informes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class AutorizacionInformesComponent implements OnInit {

  titulo = 'Autorización de Informes';

  public titulos: any[] = [];
  public datos: any[] = [];
  public columnasFiltro = ['Corte Académico', 'Sprint del Informe', 'Estado'];
  public acciones = [
    { id: 'autorizar', label: 'Autorizar Informes', icono: '/assets/images/aprobar_informes.png' }
  ];

  public anios: number[] = [];
  public anioSeleccionado: number = new Date().getFullYear();
  public cargando: boolean = false;

  constructor(
    private router: Router,
    private autorizacionesService: AutorizacionesInformesEstudiantesService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarAnios();
  }

  // El combo se arma con los años que existen en sprints. Si el año actual no
  // esta entre ellos se toma el mas reciente, para no dejar la pantalla vacia.
  cargarAnios(): void {
    this.autorizacionesService.obtenerAnios().subscribe({
      next: (response: any) => {
        this.anios = (response.body || []).map((a: any) => Number(a));

        if (this.anios.length > 0 && !this.anios.includes(this.anioSeleccionado)) {
          this.anioSeleccionado = this.anios[0];
        }

        this.cargarCortes();
      },
      error: (error) => {
        console.error('Error al cargar los años:', error);
        this.cargarCortes();
      }
    });
  }

  cargarCortes(): void {
    this.cargando = true;

    this.autorizacionesService.obtenerCortes(this.anioSeleccionado).subscribe({
      next: (response: any) => {
        const cortes = (response.body || []) as any[];

        cortes.forEach(corte => {
          corte.id = corte.id_corte_academico;
          corte.fecha_inicio_formato = this.formatearFecha(corte.fecha_inicio);
          corte.fecha_fin_formato = this.formatearFecha(corte.fecha_fin);

          const total = Number(corte.total_estudiantes) || 0;
          const autorizados = Number(corte.total_autorizados) || 0;
          corte.avance = `${autorizados} de ${total}`;
          corte.avance_clase = autorizados === 0
            ? 'badge-secondary'
            : (autorizados >= total ? 'badge-success' : 'badge-warning');

          // Tres estados posibles, en orden de bloqueo: sin sprint marcado,
          // sprint sin finalizar, y listo para publicar.
          if (!corte.id_sprint_informe) {
            corte.estado = 'Sin sprint de informe';
            corte.estado_clase = 'badge-danger';
            corte.nombre_sprint = '—';
          } else if (Number(corte.sprint_finalizado) !== 1) {
            corte.estado = 'Sprint sin finalizar';
            corte.estado_clase = 'badge-warning';
          } else {
            corte.estado = 'Publicable';
            corte.estado_clase = 'badge-success';
          }
        });

        this.datos = cortes;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar los cortes:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los cortes académicos.', 'error');
      }
    });
  }

  cambiarAnio(): void {
    this.anioSeleccionado = Number(this.anioSeleccionado);
    this.cargarCortes();
  }

  seleccionar(event: any): void {
    if (event.accion === 'autorizar' || event.accion === 'editar') {
      this.abrirAutorizacion(event.registro || event.id);
    }
  }

  // Un corte sin sprint de informe no puede publicar nada, asi que se avisa en
  // vez de abrir una pantalla que no va a servir de nada.
  abrirAutorizacion(registro: any): void {
    const corte = typeof registro === 'string'
      ? this.datos.find(c => c.id === registro)
      : registro;

    if (!corte) return;

    if (!corte.id_sprint_informe) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta el sprint de informe',
        text: 'Este corte no tiene ningún sprint marcado como sprint de informe. Márcalo en la pantalla de sprints antes de autorizar.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.router.navigate(
      ['/operaciones/autorizacion-informes/autorizar', corte.id_corte_academico],
      { queryParams: { anio: this.anioSeleccionado } }
    );
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';

    const partes = String(fecha).substring(0, 10).split('-');
    if (partes.length !== 3) return String(fecha);

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  crearTitulos(): void {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_corte',
        alias: 'Corte Académico',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_inicio_formato',
        alias: 'Desde',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_fin_formato',
        alias: 'Hasta',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_sprint',
        alias: 'Sprint del Informe',
        alinear: 'izquierda',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'estado_clase'
      },
      {
        clave: 'avance',
        alias: 'Autorizados',
        alinear: 'centrado',
        tipo: 'badge',
        claseCSS: 'avance_clase'
      }
    ];
  }
}
