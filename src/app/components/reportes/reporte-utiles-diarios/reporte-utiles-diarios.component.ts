import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { RegistroUtilesDiariosService } from '../../../services/utiles-diarios-registro.service';
import { GruposService } from '../../../services/grupos.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-reporte-utiles-diarios',
  templateUrl: './reporte-utiles-diarios.component.html',
  styleUrl: './reporte-utiles-diarios.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class ReporteUtilesDiariosComponent implements OnInit {

  titulo = "Reporte de Útiles y Accesorios Diarios";
  public columnasFiltro = ['Estudiante', 'Útil', 'Grupo'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  public grupos = [] as any[];
  public estudiantes = [] as any[];

  // Los dos cortes conviven: se puede filtrar por grupo en un día o por
  // estudiante en un rango. Todos los filtros son opcionales y se suman.
  public filtros = {
    id_grupo: null,
    id_estudiante: null,
    fecha_inicial: '',
    fecha_final: '',
    solo_faltantes: false
  } as any;

  public consultado: boolean = false;

  constructor(
    private registroUtilesDiariosService: RegistroUtilesDiariosService,
    private gruposService: GruposService,
    private estudiantesService: EstudiantesService
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.consultaGrupos();

    const hoy = this.obtenerFechaActual();
    this.filtros.fecha_inicial = hoy;
    this.filtros.fecha_final = hoy;
  }

  /**
   * Fecha actual en formato YYYY-MM-DD con hora local, no UTC.
   * No usar toISOString() porque desfasa el día.
   */
  private obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'fecha', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'grupo', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'util', alias: 'Útil', alinear: 'izquierda' },
      { clave: 'trajo_texto', alias: 'Trajo', alinear: 'centrado' },
      { clave: 'regreso_texto', alias: 'Se lo llevó', alinear: 'centrado' },
      { clave: 'observacion', alias: 'Observación', alinear: 'izquierda' },
    ];
  }

  consultaGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = (response.body as any[]) || [];
      },
      error: () => {
        this.grupos = [];
      }
    });
  }

  cambiarGrupo() {
    this.filtros.id_estudiante = null;
    this.estudiantes = [];

    if (!this.filtros.id_grupo) {
      return;
    }

    this.estudiantesService.obtenerTodosXGrupo(this.filtros.id_grupo).subscribe({
      next: (response: any) => {
        this.estudiantes = (response.body as any[]) || [];
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  consultar() {
    if (!this.filtros.id_grupo && !this.filtros.id_estudiante) {
      Swal.fire('Advertencia', 'Selecciona al menos un grupo o un estudiante', 'warning');
      return;
    }

    const filtros = {
      id_grupo: this.filtros.id_grupo || null,
      id_estudiante: this.filtros.id_estudiante || null,
      fecha_inicial: this.filtros.fecha_inicial || null,
      fecha_final: this.filtros.fecha_final || null,
      solo_faltantes: this.filtros.solo_faltantes ? 1 : 0
    };

    this.registroUtilesDiariosService.obtenerReporte(filtros).subscribe({
      next: (respuesta: any) => {
        const body = (respuesta as any[]) || [];
        this.datos = body.map((d: any) => ({
          ...d,
          trajo_texto: d.trajo == 1 ? 'Sí' : 'No',
          // regreso en null significa que todavía no se ha revisado la salida,
          // que es distinto de que se haya ido sin la cosa.
          regreso_texto: d.regreso === null || d.regreso === undefined
            ? 'Sin revisar'
            : (d.regreso == 1 ? 'Sí' : 'No')
        }));
        this.consultado = true;
      },
      error: () => {
        Swal.fire('Error', 'No se pudo consultar el reporte', 'error');
      }
    });
  }

  limpiar() {
    const hoy = this.obtenerFechaActual();
    this.filtros = {
      id_grupo: null,
      id_estudiante: null,
      fecha_inicial: hoy,
      fecha_final: hoy,
      solo_faltantes: false
    };
    this.estudiantes = [];
    this.datos = [];
    this.consultado = false;
  }
}
