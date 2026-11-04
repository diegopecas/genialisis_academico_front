import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CursosExtraService } from '../../../services/cursos-extra.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reporte-cursos-extra',
  templateUrl: './reporte-cursos-extra.component.html',
  styleUrl: './reporte-cursos-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteCursosExtraComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  titulo = 'Reporte de Cursos Extracurriculares';
  titulos: any[] = [];
  datos: any[] = [];

  // La fecha de inscripcion va por rango para poder acotar un periodo, y el
  // resto son listas de valores. 'Curso' solo existe en la pestana Todos.
  columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [];

  // Todos los inscritos activos; en la tabla van los de la pestana activa
  todos: any[] = [];
  // Una pestana por curso con inscritos activos, mas Todos de primera
  pestanas: { clave: string, texto: string, cantidad: number, cupo: number | null }[] = [];
  pestanaActiva: string = 'todos';
  // La columna Grupo (salon del jardin) solo sale si algun inscrito tiene grupo
  hayGrupos: boolean = false;

  cargando = false;
  exportando = false;
  // Desde cada inscrito se va a sus productos y servicios (cuentas y pagos)
  acciones: any[] = [{ id: 'productos', label: 'Productos y servicios' }];

  constructor(private cursosExtraService: CursosExtraService, private router: Router) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarInscritos();
  }

  /** Inscritos activos de todos los cursos, de una vez */
  cargarInscritos() {
    this.cargando = true;
    this.cursosExtraService.obtenerInscritosActivos().subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.todos = body.map((e: any) => {
          const cobrado = Number(e.valor_cobrado || 0);
          const pagado = Number(e.valor_pagado || 0);

          return {
            ...e,
            nombre_completo: (e.nombre_completo || '').replace(/\s+/g, ' ').trim(),
            nombre_grupo: e.nombre_grupo || '-',
            cobro: this.estadoCobro(e, cobrado, pagado),
            valor_cobrado: cobrado,
            valor_pagado: pagado,
            saldo: cobrado - pagado
          };
        });
        this.hayGrupos = this.todos.some((e: any) => e.nombre_grupo !== '-');
        this.armarPestanas();
        this.seleccionarPestana('todos');
        this.cargando = false;
      },
      error: (error: any) => {
        console.error("Error al cargar inscritos", error);
        this.cargando = false;
      }
    });
  }

  /** Todos y un curso por pestana (solo los que tienen inscritos activos), en orden alfabetico */
  private armarPestanas() {
    const cursos = new Map<string, { clave: string, texto: string, cantidad: number, cupo: number | null }>();
    this.todos.forEach((e: any) => {
      const curso = cursos.get(e.id_curso_extra);
      if (curso) {
        curso.cantidad++;
      } else {
        cursos.set(e.id_curso_extra, {
          clave: e.id_curso_extra, texto: e.nombre_curso, cantidad: 1,
          cupo: e.cupo_maximo ? Number(e.cupo_maximo) : null
        });
      }
    });
    this.pestanas = [
      { clave: 'todos', texto: 'Todos', cantidad: this.todos.length, cupo: null },
      ...Array.from(cursos.values()).sort((a, b) => a.texto.localeCompare(b.texto))
    ];
  }

  seleccionarPestana(clave: string) {
    this.pestanaActiva = clave;
    this.crearTitulos();
    this.datos = clave === 'todos' ? this.todos : this.todos.filter((e: any) => e.id_curso_extra === clave);
  }

  clicAccion($event: any) {
    if ($event.accion === 'productos' && $event.registro?.id_estudiante) {
      this.router.navigate(['/estudiantes/productos-servicios/' + $event.registro.id_estudiante]);
    }
  }

  get pestanaActual() {
    return this.pestanas.find(p => p.clave === this.pestanaActiva) || null;
  }

  /**
   * Como va el cobro de la inscripcion. Se lee de los valores y no del numero
   * de cuentas: una inscripcion puede tener cuentas anuladas, que no suman al
   * cobrado, y entonces no hay nada que pagar.
   */
  private estadoCobro(inscrito: any, cobrado: number, pagado: number): string {
    if (Number(inscrito.total_cuentas || 0) === 0) return 'Sin cobro';
    if (cobrado === 0) return 'Anulado';
    if (pagado <= 0) return 'Pendiente';
    if (pagado >= cobrado) return 'Pagado';
    return 'Parcial';
  }

  // Solo salen inscritos activos, asi que ya no van Estado ni Fecha Retiro.
  // En Todos va tambien el curso.
  crearTitulos() {
    const todos = this.pestanaActiva === 'todos';
    this.titulos = [
      { clave: 'nombre_completo', alias: 'Nombre Completo', alinear: 'izquierda' },
      ...(todos ? [{ clave: 'nombre_curso', alias: 'Curso', alinear: 'izquierda' }] : []),
      ...(this.hayGrupos ? [{ clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' }] : []),
      { clave: 'fecha_inscripcion', alias: 'Fecha Inscripción', alinear: 'centrado' },
      { clave: 'anio', alias: 'Año', alinear: 'centrado' },
      { clave: 'cobro', alias: 'Cobro', alinear: 'centrado' },
      { clave: 'valor_cobrado', alias: 'Cobrado', tipo: 'money' },
      { clave: 'valor_pagado', alias: 'Pagado', tipo: 'money' },
      { clave: 'saldo', alias: 'Saldo', tipo: 'money' },
    ];
    this.columnasFiltro = [
      'Nombre Completo',
      ...(todos ? ['Curso'] : []),
      ...(this.hayGrupos ? ['Grupo'] : []),
      'Cobro',
      'Año',
      { columna: 'Fecha Inscripción', tipoFiltro: 'rango' }
    ];
  }

  /** Inscripciones vigentes de la pestana, que son las que ocupan cupo. */
  contarActivos(): number {
    return this.datos.length;
  }

  /** Totales del pie, calculados sobre lo que dejan ver los filtros. */
  get datosVisibles(): any[] {
    return this.tablasComponent?.tabla?.datosFiltrados || this.datos;
  }

  get totalCobrado(): number {
    return this.datosVisibles.reduce((acc: number, e: any) => acc + Number(e.valor_cobrado || 0), 0);
  }

  get totalPagado(): number {
    return this.datosVisibles.reduce((acc: number, e: any) => acc + Number(e.valor_pagado || 0), 0);
  }

  get totalSaldo(): number {
    return this.totalCobrado - this.totalPagado;
  }

  exportarExcel() {
    if (this.datos.length === 0) return;
    this.exportando = true;

    let datosParaExportar = this.datos;
    if (this.tablasComponent?.tabla?.datosFiltrados) {
      datosParaExportar = this.tablasComponent.tabla.datosFiltrados;
    }

    const todos = this.pestanaActiva === 'todos';
    const datosExportar = datosParaExportar.map((e: any) => ({
      'Nombre Completo': e.nombre_completo,
      ...(todos ? { 'Curso': e.nombre_curso } : {}),
      ...(this.hayGrupos ? { 'Grupo': e.nombre_grupo } : {}),
      'Fecha Inscripción': e.fecha_inscripcion,
      'Año': e.anio,
      'Cobro': e.cobro,
      // Los valores van como numero y no como texto para que en Excel se
      // puedan sumar y filtrar sin tener que limpiarlos antes.
      'Cobrado': Number(e.valor_cobrado || 0),
      'Pagado': Number(e.valor_pagado || 0),
      'Saldo': Number(e.saldo || 0),
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');

    ws['!cols'] = [
      { wch: 35 }, ...(todos ? [{ wch: 30 }] : []), ...(this.hayGrupos ? [{ wch: 16 }] : []), { wch: 18 }, { wch: 8 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const nombreCurso = todos ? 'todos' : (this.pestanaActual?.texto?.replace(/\s+/g, '_') || 'curso');
    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_${nombreCurso}_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}