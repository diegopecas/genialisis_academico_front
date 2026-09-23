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

          // El estado se basa en los informes confirmados del corte, que es
          // lo que el boletin nuevo publica. El sprint se sigue mostrando
          // porque el informe viejo todavia lo usa, pero ya no manda.
          const confirmados = Number(corte.total_informes_confirmados) || 0;
          corte.total_informes_confirmados = confirmados;

          if (!corte.id_sprint_informe) {
            corte.nombre_sprint = '—';
          }

          if (confirmados > 0) {
            corte.estado = `${confirmados} informes listos`;
            corte.estado_clase = 'badge-success';
          } else if (corte.id_sprint_informe && Number(corte.sprint_finalizado) === 1) {
            // Sin informes nuevos pero con sprint finalizado: es el caso del
            // informe viejo, que sigue siendo publicable.
            corte.estado = 'Publicable';
            corte.estado_clase = 'badge-success';
          } else {
            corte.estado = 'Sin informes confirmados';
            corte.estado_clase = 'badge-secondary';
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

  /**
   * El sprint ya no bloquea: el boletin nuevo cuelga del corte y no de un
   * sprint. Si el corte no tiene informes confirmados ni sprint finalizado
   * se avisa, pero se deja entrar.
   */
  abrirAutorizacion(registro: any): void {
    const corte = typeof registro === 'string'
      ? this.datos.find(c => c.id === registro)
      : registro;

    if (!corte) return;

    const confirmados = Number(corte.total_informes_confirmados) || 0;
    const sprintListo = corte.id_sprint_informe && Number(corte.sprint_finalizado) === 1;

    if (confirmados === 0 && !sprintListo) {
      Swal.fire({
        icon: 'info',
        title: 'Este corte todavía no tiene informes',
        text: 'No hay informes confirmados para este corte. Puedes autorizar de una vez, pero el acudiente no verá nada hasta que los confirmes en Generación de Informes.',
        confirmButtonText: 'Entendido'
      });
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
