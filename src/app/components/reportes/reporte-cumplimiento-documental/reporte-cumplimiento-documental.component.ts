import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';

@Component({
  selector: 'app-reporte-cumplimiento-documental',
  templateUrl: './reporte-cumplimiento-documental.component.html',
  styleUrl: './reporte-cumplimiento-documental.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteCumplimientoDocumentalComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  titulo = 'Cumplimiento Documental';

  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = [
    'Persona',
    'Rol',
    'Estado Persona',
    'Categoría',
    'Documento',
    'Obligatorio',
    'Estado',
  ];

  // Accion propia: bajar el archivo de la fila, cuando existe.
  public acciones = [
    { id: 'descargar', label: 'Descargar', icono: '/assets/images/descargar-documento.png' },
  ];

  public cargando = false;
  public exportando = false;

  // Totales del encabezado
  public totalExigidos = 0;
  public totalSinSubir = 0;
  public totalVencidos = 0;
  public totalPersonas = 0;

  constructor(private documentosPersonasService: DocumentosPersonasService) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.consultar();
  }

  consultar(): void {
    this.cargando = true;
    this.documentosPersonasService.obtenerReporteCumplimiento().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          estado_texto: this.textoEstado(item.estado),
          obligatorio_texto: item.obligatorio ? 'Obligatorio' : 'Opcional',
          persona_estado: item.persona_activa ? 'Activa' : 'Inactiva',
          fecha_subida_texto: item.fecha_subida
            ? this.formatearFecha(item.fecha_subida.split(' ')[0])
            : '',
          fecha_vencimiento_texto: item.fecha_vencimiento
            ? this.formatearFecha(item.fecha_vencimiento)
            : '',
          tamanio_texto: this.formatearTamano(item.tamanio_bytes),
          // Solo aplica a documentos con vencimiento; en el resto queda vacio.
          dias_para_vencer_texto:
            item.dias_para_vencer !== null && item.dias_para_vencer !== undefined
              ? item.dias_para_vencer
              : '',
          subido_por_texto: item.nombre_usuario_subio
            ? item.nombre_usuario_subio
            : item.usuario_subio
              ? item.usuario_subio
              : '',
          // Rojo para lo que falta, naranja suave para lo vencido
          color: this.colorFila(item),
        }));

        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar el reporte de cumplimiento', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
      },
    });
  }

  /**
   * Solo se resalta lo obligatorio: un opcional sin subir no es un problema.
   */
  private colorFila(item: any): string {
    if (item.estado === 'SIN_SUBIR' && item.obligatorio) {
      return '#ffe3e3';
    }
    if (item.estado === 'VENCIDO') {
      return '#fff3cd';
    }
    return '';
  }

  /**
   * El resumen sigue lo que muestra la tabla: se recalcula cada vez que cambian
   * los filtros, no solo al cargar.
   */
  actualizarResumen(filas: any[]): void {
    const datos = filas || [];
    this.totalExigidos = datos.length;
    this.totalSinSubir = datos.filter(
      (d) => d.estado === 'SIN_SUBIR' && d.obligatorio,
    ).length;
    this.totalVencidos = datos.filter((d) => d.estado === 'VENCIDO').length;
    this.totalPersonas = new Set(datos.map((d) => d.id_persona)).size;
  }

  clicAccion($event: any): void {
    if ($event.accion === 'descargar') {
      this.descargar($event.registro);
    }
  }

  descargar(registro: any): void {
    // Las filas sin documento existen a proposito: son justo lo que falta.
    if (!registro || !registro.id_documento) {
      Swal.fire('Sin archivo', 'Este documento todavía no se ha subido.', 'info');
      return;
    }

    this.documentosPersonasService.descargarDocumentoArchivo(
      registro.id_documento,
      this.armarNombreDescarga(registro),
    );
  }

  private armarNombreDescarga(registro: any): string {
    const limpiar = (texto: string) =>
      String(texto || '')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const partes = [
      limpiar(registro.nombre_persona),
      limpiar(registro.nombre_documento),
      (registro.fecha_subida || '').split(' ')[0],
    ].filter((parte) => parte !== '');

    const base = partes.join(' - ');
    const extension = (registro.nombre_archivo || '').split('.').pop();

    if (!extension || extension === registro.nombre_archivo) {
      return base;
    }
    return `${base}.${extension}`;
  }

  formatearTamano(bytes: number): string {
    if (!bytes && bytes !== 0) {
      return '';
    }
    if (bytes < 1048576) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  crearTitulos(): void {
    this.titulos = [
      { clave: 'nombre_persona', alias: 'Persona', alinear: 'izquierda' },
      { clave: 'numero_identificacion', alias: 'Identificación', alinear: 'izquierda' },
      { clave: 'nombre_rol', alias: 'Rol', alinear: 'izquierda' },
      { clave: 'persona_estado', alias: 'Estado Persona', alinear: 'centrado' },
      { clave: 'categoria_nombre', alias: 'Categoría', alinear: 'izquierda' },
      { clave: 'nombre_documento', alias: 'Documento', alinear: 'izquierda' },
      { clave: 'obligatorio_texto', alias: 'Obligatorio', alinear: 'centrado' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'fecha_subida_texto', alias: 'Subido', alinear: 'centrado' },
      { clave: 'fecha_vencimiento_texto', alias: 'Vence', alinear: 'centrado' },
      { clave: 'dias_para_vencer_texto', alias: 'Días para vencer', alinear: 'centrado' },
      { clave: 'subido_por_texto', alias: 'Subido por', alinear: 'izquierda' },
      // Nombre y peso del archivo al final, igual que en Documentos Registrados.
      { clave: 'nombre_archivo', alias: 'Archivo', alinear: 'izquierda' },
      { clave: 'tamanio_texto', alias: 'Tamaño', alinear: 'centrado' },
    ];
  }

  textoEstado(estado: string): string {
    switch (estado) {
      case 'SIN_SUBIR':
        return 'Sin subir';
      case 'VENCIDO':
        return 'Vencido';
      case 'PROXIMO_VENCER':
        return 'Próximo a vencer';
      case 'VIGENTE':
        return 'Vigente';
      default:
        return 'Sin vencimiento';
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const [year, month, day] = fecha.split('-').map(Number);
    if (!year) return '';
    return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  exportarExcel(): void {
    this.exportando = true;

    let datosParaExportar = this.datos;
    if (
      this.tablasComponent &&
      this.tablasComponent.tabla &&
      this.tablasComponent.tabla.datosFiltrados
    ) {
      datosParaExportar = this.tablasComponent.tabla.datosFiltrados;
    }

    const datosExportar = datosParaExportar.map((d) => ({
      Persona: d.nombre_persona,
      Identificación: d.numero_identificacion,
      Rol: d.nombre_rol,
      'Estado Persona': d.persona_estado,
      Categoría: d.categoria_nombre,
      Documento: d.nombre_documento,
      Obligatorio: d.obligatorio_texto,
      Estado: d.estado_texto,
      Subido: d.fecha_subida_texto,
      Vence: d.fecha_vencimiento_texto,
      'Días para vencer': d.dias_para_vencer_texto,
      'Subido por': d.subido_por_texto,
      Archivo: d.nombre_archivo,
      Tamaño: d.tamanio_texto,
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cumplimiento');

    ws['!cols'] = [
      { wch: 32 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
      { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 30 }, { wch: 14 },
      { wch: 14 }, { wch: 14 },
    ];

    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `cumplimiento_documental_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}
