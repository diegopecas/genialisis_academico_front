import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  // Antes declaraba 'Curso', que no existe como columna de la tabla: el curso
  // se escoge arriba en el selector, no se filtra aqui. Las dos fechas van por
  // rango para poder acotar un periodo, y el resto son listas de valores.
  columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [
    'Nombre Completo',
    'Grupo',
    'Estado',
    'Cobro',
    'Año',
    { columna: 'Fecha Inscripción', tipoFiltro: 'rango' },
    { columna: 'Fecha Retiro', tipoFiltro: 'rango' }
  ];

  cursosExtra: any[] = [];
  idCursoSeleccionado: any = null;
  cursoSeleccionado: any = null;

  cargando = false;
  exportando = false;
  acciones: any[] = [];

  constructor(private cursosExtraService: CursosExtraService) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarCursos();
  }

  cargarCursos() {
    this.cursosExtraService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cursosExtra = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar cursos", error);
      }
    });
  }

  onCursoChange() {
    if (!this.idCursoSeleccionado) {
      this.datos = [];
      this.cursoSeleccionado = null;
      return;
    }
    this.cursoSeleccionado = this.cursosExtra.find((c: any) => c.id == this.idCursoSeleccionado);
    this.cargarInscritos();
  }

  cargarInscritos() {
    this.cargando = true;
    this.cursosExtraService.obtenerInscritos(this.idCursoSeleccionado).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.datos = body.map((e: any) => {
          const cobrado = Number(e.valor_cobrado || 0);
          const pagado = Number(e.valor_pagado || 0);

          return {
            ...e,
            estado: e.activo === 1 ? 'Activo' : 'Retirado',
            fecha_retiro: e.fecha_retiro || '-',
            nombre_grupo: e.nombre_grupo || '-',
            cobro: this.estadoCobro(e, cobrado, pagado),
            valor_cobrado: cobrado,
            valor_pagado: pagado,
            saldo: cobrado - pagado,
            color: e.activo === 0 ? '#e2e9f3' : ''
          };
        });
        this.cargando = false;
      },
      error: (error: any) => {
        console.error("Error al cargar inscritos", error);
        this.cargando = false;
      }
    });
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

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_completo', alias: 'Nombre Completo', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' },
      { clave: 'fecha_inscripcion', alias: 'Fecha Inscripción', alinear: 'centrado' },
      { clave: 'fecha_retiro', alias: 'Fecha Retiro', alinear: 'centrado' },
      { clave: 'anio', alias: 'Año', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
      { clave: 'cobro', alias: 'Cobro', alinear: 'centrado' },
      { clave: 'valor_cobrado', alias: 'Cobrado', tipo: 'money' },
      { clave: 'valor_pagado', alias: 'Pagado', tipo: 'money' },
      { clave: 'saldo', alias: 'Saldo', tipo: 'money' },
    ];
  }

  /** Inscripciones vigentes, que son las que ocupan cupo. */
  contarActivos(): number {
    return this.datos.filter((e: any) => e.activo === 1).length;
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

    const datosExportar = datosParaExportar.map((e: any) => ({
      'Nombre Completo': e.nombre_completo,
      'Grupo': e.nombre_grupo,
      'Fecha Inscripción': e.fecha_inscripcion,
      'Fecha Retiro': e.fecha_retiro,
      'Año': e.anio,
      'Estado': e.estado,
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
      { wch: 35 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 8 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const nombreCurso = this.cursoSeleccionado?.nombre?.replace(/\s+/g, '_') || 'curso';
    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_${nombreCurso}_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}