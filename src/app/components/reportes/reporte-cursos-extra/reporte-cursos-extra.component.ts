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
  columnasFiltro: string[] = ['Curso', 'Estado'];

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
        this.datos = body.map((e: any) => ({
          ...e,
          estado: e.activo === 1 ? 'Activo' : 'Inactivo',
          color: e.activo === 0 ? '#e2e9f3' : ''
        }));
        this.cargando = false;
      },
      error: (error: any) => {
        console.error("Error al cargar inscritos", error);
        this.cargando = false;
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_completo', alias: 'Nombre Completo', alinear: 'izquierda' },
      { clave: 'fecha_inscripcion', alias: 'Fecha Inscripción', alinear: 'centrado' },
      { clave: 'anio', alias: 'Año', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
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
      'Fecha Inscripción': e.fecha_inscripcion,
      'Año': e.anio,
      'Estado': e.estado,
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');

    ws['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 8 }, { wch: 10 }];

    const nombreCurso = this.cursoSeleccionado?.nombre?.replace(/\s+/g, '_') || 'curso';
    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_${nombreCurso}_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}