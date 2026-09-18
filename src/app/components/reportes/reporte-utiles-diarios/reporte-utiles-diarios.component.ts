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
  // Estudiantes ya consultados, por grupo
  private estudiantesPorGrupo: any = {};

  // Los dos cortes conviven: se puede filtrar por grupo en un día o por
  // estudiante en un rango. Todos los filtros son opcionales y se suman; sin
  // grupo ni estudiante trae el jardin completo.
  public filtros = {
    id_grupo: null,
    id_estudiante: null,
    fecha_inicial: '',
    fecha_final: ''
  } as any;

  public consultado: boolean = false;

  // ---- Vista de matriz ----
  // El listado obliga a leer renglón por renglón para saber qué pasó con un
  // niño en el mes. La matriz lo muestra de un vistazo: una fila por
  // estudiante y una columna por día.
  public vista: 'lista' | 'matriz' = 'matriz';

  // El mes llega completo una sola vez. Grupo, estudiante, útil y estado se
  // resuelven en memoria: volver al backend por cada filtro era una consulta
  // por clic sin traer nada que no estuviera ya cargado.
  private matrizCompleta = { dias: [] as any[], estudiantes: [] as any[] };

  public filtrosMatriz = {
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    id_grupo: null as any,
    estudiante: '',
    util: '',
    estado: ''
  };

  public utilesDelMes = [] as string[];

  public estados = [
    { valor: 'trajo', nombre: 'Lo trajo y se lo llevó' },
    { valor: 'pendiente', nombre: 'Lo trajo, no se lo llevó' },
    { valor: 'falto', nombre: 'No lo trajo' },
    { valor: 'sin_revisar', nombre: 'Sin revisar' }
  ];

  public anios = [] as number[];
  public meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  public consultadoMatriz = false;
  public cargandoMatriz = false;

  // Celda abierta en el detalle
  public detalle: any = null;

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

    const anioActual = new Date().getFullYear();
    this.anios = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];

    this.consultarMatriz();
  }

  cambiarVista(vista: 'lista' | 'matriz'): void {
    this.vista = vista;
  }

  /** Solo se llama al cambiar mes o año: el resto se filtra en memoria. */
  consultarMatriz(): void {
    this.cargandoMatriz = true;
    this.detalle = null;

    this.registroUtilesDiariosService.obtenerMatriz({
      anio: this.filtrosMatriz.anio,
      mes: this.filtrosMatriz.mes,
      id_grupo: null
    }).subscribe({
      next: (respuesta: any) => {
        this.matrizCompleta = {
          dias: respuesta.dias || [],
          estudiantes: respuesta.estudiantes || []
        };
        this.utilesDelMes = this.armarListaDeUtiles();
        this.consultadoMatriz = true;
        this.cargandoMatriz = false;
      },
      error: () => {
        this.cargandoMatriz = false;
        Swal.fire('Error', 'No se pudo consultar la matriz', 'error');
      }
    });
  }

  /** Útiles que aparecen en el mes, para el selector. */
  private armarListaDeUtiles(): string[] {
    const nombres = new Set<string>();

    this.matrizCompleta.estudiantes.forEach((estudiante: any) => {
      Object.keys(estudiante.dias || {}).forEach((fecha: string) => {
        (estudiante.dias[fecha] || []).forEach((util: any) => {
          if (util.util) {
            nombres.add(util.util);
          }
        });
      });
    });

    return Array.from(nombres).sort((a, b) => a.localeCompare(b, 'es'));
  }

  /**
   * Días que se pintan: solo los que tienen registros de algún estudiante
   * visible. Un mes completo deja veinte columnas vacías que solo estorban.
   */
  get diasVisibles(): any[] {
    const estudiantes = this.estudiantesVisibles;

    return this.matrizCompleta.dias.filter((dia: any) =>
      estudiantes.some((estudiante: any) => this.utilesDe(estudiante, dia).length > 0)
    );
  }

  /** Estudiantes que quedan tras los filtros, y que tienen algo que mostrar. */
  get estudiantesVisibles(): any[] {
    const texto = this.normalizar(this.filtrosMatriz.estudiante);

    return this.matrizCompleta.estudiantes.filter((estudiante: any) => {
      if (this.filtrosMatriz.id_grupo && estudiante.id_grupo !== this.filtrosMatriz.id_grupo) {
        return false;
      }
      if (texto !== '' && !this.normalizar(estudiante.nombre).includes(texto)) {
        return false;
      }

      // Con filtro de útil o de estado, quien no tenga nada que coincida sobra.
      if (this.filtrosMatriz.util === '' && this.filtrosMatriz.estado === '') {
        return true;
      }

      return this.matrizCompleta.dias.some(
        (dia: any) => this.utilesDe(estudiante, dia).length > 0
      );
    });
  }

  private normalizar(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  limpiarFiltrosMatriz(): void {
    this.filtrosMatriz.id_grupo = null;
    this.filtrosMatriz.estudiante = '';
    this.filtrosMatriz.util = '';
    this.filtrosMatriz.estado = '';
  }

  get hayFiltrosMatriz(): boolean {
    return !!this.filtrosMatriz.id_grupo
      || this.filtrosMatriz.estudiante !== ''
      || this.filtrosMatriz.util !== ''
      || this.filtrosMatriz.estado !== '';
  }

  /**
   * Útiles de un estudiante en un día, ya filtrados por útil y por estado.
   * Vacío si ese día no tuvo registro o si nada coincide con el filtro.
   */
  utilesDe(estudiante: any, dia: any): any[] {
    const utiles = (estudiante.dias && estudiante.dias[dia.fecha]) || [];

    if (this.filtrosMatriz.util === '' && this.filtrosMatriz.estado === '') {
      return utiles;
    }

    return utiles.filter((util: any) => {
      if (this.filtrosMatriz.util !== '' && util.util !== this.filtrosMatriz.util) {
        return false;
      }
      if (this.filtrosMatriz.estado !== '' && this.estadoDe(util) !== this.filtrosMatriz.estado) {
        return false;
      }
      return true;
    });
  }

  /**
   * Estado de un útil, que es lo que define el icono:
   * trajo -> lo trajo y se lo llevó; pendiente -> trajo y no se lo llevó;
   * falto -> no lo trajo; sin_revisar -> aún no se ha revisado.
   */
  estadoDe(util: any): string {
    if (util.trajo === null || util.trajo === undefined) {
      return 'sin_revisar';
    }
    if (Number(util.trajo) !== 1) {
      return 'falto';
    }
    return Number(util.regreso) === 1 ? 'trajo' : 'pendiente';
  }

  tituloDe(util: any): string {
    const estados: any = {
      trajo: 'Lo trajo y se lo llevó',
      pendiente: 'Lo trajo, no se lo llevó',
      falto: 'No lo trajo',
      sin_revisar: 'Sin revisar'
    };

    const detalle = util.observacion ? ' · ' + util.observacion : '';
    return util.util + ': ' + estados[this.estadoDe(util)] + detalle;
  }

  /** Un día con algo que revisar: algo no traído o no devuelto. */
  tieneAlerta(estudiante: any, dia: any): boolean {
    return this.utilesDe(estudiante, dia).some(
      (util: any) => this.estadoDe(util) === 'falto' || this.estadoDe(util) === 'pendiente'
    );
  }

  abrirDetalle(estudiante: any, dia: any): void {
    const utiles = this.utilesDe(estudiante, dia);

    if (utiles.length === 0) {
      return;
    }

    this.detalle = {
      estudiante: estudiante.nombre,
      fecha: dia.fecha,
      dia: dia.dia,
      utiles
    };
  }

  cerrarDetalle(): void {
    this.detalle = null;
  }

  fechaTexto(fecha: string): string {
    if (!fecha) {
      return '';
    }
    // Se corta la cadena en vez de usar Date para no correr el día por zona horaria.
    const partes = fecha.substring(0, 10).split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
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

    // Los estudiantes de un grupo no cambian mientras dura la consulta: se
    // piden una vez y se guardan. Antes se consultaban en cada cambio de grupo,
    // incluso al volver a uno ya visto.
    const enMemoria = this.estudiantesPorGrupo[this.filtros.id_grupo];

    if (enMemoria) {
      this.estudiantes = enMemoria;
      return;
    }

    this.estudiantesService.obtenerTodosXGrupo(this.filtros.id_grupo).subscribe({
      next: (response: any) => {
        const lista = (response.body as any[]) || [];
        this.estudiantesPorGrupo[this.filtros.id_grupo] = lista;
        this.estudiantes = lista;
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  consultar() {
    const filtros = {
      id_grupo: this.filtros.id_grupo || null,
      id_estudiante: this.filtros.id_estudiante || null,
      fecha_inicial: this.filtros.fecha_inicial || null,
      fecha_final: this.filtros.fecha_final || null,
      solo_faltantes: 0
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
      fecha_final: hoy
    };
    this.estudiantes = [];
    this.datos = [];
    this.consultado = false;
  }
}
