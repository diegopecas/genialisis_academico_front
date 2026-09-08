import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';

@Component({
  selector: 'app-reporte-documentos',
  templateUrl: './reporte-documentos.component.html',
  styleUrl: './reporte-documentos.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteDocumentosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  titulo = 'Documentos Registrados';

  public titulos = [] as any[];
  public datos = [] as any[];
  // Roles va como tipoFiltro 'lista': la celda trae varios roles en un solo
  // texto ("Acudiente, Colaborador") y el filtro debe ofrecerlos por separado.
  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [
    'Persona',
    { columna: 'Roles', tipoFiltro: 'lista' },
    'Estado Persona',
    'Categoría',
    'Documento',
    'Obligatorio',
    'Estado',
  ];

  // Resumen del pie, calculado sobre lo que la tabla deja despues de filtrar.
  public totalVisibles = 0;
  public totalVencidos = 0;
  public totalPorVencer = 0;
  public totalPersonas = 0;

  // Accion propia de este reporte: bajar el archivo de la fila.
  public acciones = [
    { id: 'descargar', label: 'Descargar', icono: '/assets/images/descargar-documento.png' },
  ];

  public cargando = false;
  public exportando = false;

  constructor(private documentosPersonasService: DocumentosPersonasService) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.consultar();
  }

  consultar(): void {
    this.cargando = true;
    this.documentosPersonasService.obtenerReporteDocumentos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          roles_persona: item.roles_persona ? item.roles_persona : 'Sin rol',
          persona_estado: item.persona_activa ? 'Activa' : 'Inactiva',
          obligatorio_texto: item.obligatorio ? 'Obligatorio' : 'Opcional',
          estado_texto: this.textoEstado(item.estado_vencimiento),
          tamanio_texto: this.formatearTamano(item.tamanio_bytes),
          // Solo aplica a documentos con vencimiento; en el resto queda vacio
          // en vez de mostrar un numero sin sentido.
          dias_para_vencer_texto:
            item.dias_para_vencer !== null && item.dias_para_vencer !== undefined
              ? item.dias_para_vencer
              : '',
          fecha_subida_texto: this.formatearFechaHora(item.fecha_subida),
          fecha_vencimiento_texto: item.fecha_vencimiento
            ? this.formatearFecha(item.fecha_vencimiento)
            : '',
          // Si el usuario que subio no tiene persona asociada se muestra el
          // nombre de usuario.
          subido_por_texto: item.nombre_usuario_subio
            ? item.nombre_usuario_subio
            : item.usuario_subio
              ? item.usuario_subio
              : '',
          // Fila resaltada cuando el documento ya está vencido
          color: item.estado_vencimiento === 'VENCIDO' ? '#ffe3e3' : '',
        }));
        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar el reporte de documentos', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el reporte', 'error');
      },
    });
  }

  crearTitulos(): void {
    this.titulos = [
      { clave: 'nombre_persona', alias: 'Persona', alinear: 'izquierda' },
      { clave: 'numero_identificacion', alias: 'Identificación', alinear: 'izquierda' },
      { clave: 'roles_persona', alias: 'Roles', alinear: 'izquierda' },
      { clave: 'persona_estado', alias: 'Estado Persona', alinear: 'centrado' },
      { clave: 'categoria_nombre', alias: 'Categoría', alinear: 'izquierda' },
      { clave: 'nombre_documento', alias: 'Documento', alinear: 'izquierda' },
      { clave: 'obligatorio_texto', alias: 'Obligatorio', alinear: 'centrado' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'fecha_subida_texto', alias: 'Subido', alinear: 'centrado' },
      { clave: 'fecha_vencimiento_texto', alias: 'Vence', alinear: 'centrado' },
      { clave: 'dias_para_vencer_texto', alias: 'Días para vencer', alinear: 'centrado' },
      { clave: 'subido_por_texto', alias: 'Subido por', alinear: 'izquierda' },
      { clave: 'observaciones', alias: 'Observaciones', alinear: 'izquierda' },
      // Nombre y peso del archivo al final: son el detalle, no lo que se busca.
      { clave: 'nombre_archivo', alias: 'Archivo', alinear: 'izquierda' },
      { clave: 'tamanio_texto', alias: 'Tamaño', alinear: 'centrado' },
    ];
  }

  /**
   * El resumen del pie sigue lo que muestra la tabla: se recalcula cada vez que
   * cambian los filtros, no solo al cargar.
   */
  actualizarResumen(filas: any[]): void {
    const datos = filas || [];
    this.totalVisibles = datos.length;
    this.totalVencidos = datos.filter((d) => d.estado_vencimiento === 'VENCIDO').length;
    this.totalPorVencer = datos.filter(
      (d) => d.estado_vencimiento === 'PROXIMO_VENCER',
    ).length;
    this.totalPersonas = new Set(datos.map((d) => d.id_persona)).size;
  }

  clicAccion($event: any): void {
    if ($event.accion === 'descargar') {
      this.descargar($event.registro);
    }
  }

  descargar(registro: any): void {
    if (!registro || !registro.id) {
      return;
    }
    this.documentosPersonasService.descargarDocumentoArchivo(
      registro.id,
      this.armarNombreDescarga(registro),
    );
  }

  /**
   * Mismo criterio de nombre que en la pantalla de documentos de la persona:
   * Persona - Tipo - Fecha, para que los archivos bajados de aquí se
   * reconozcan igual.
   */
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

  textoEstado(estado: string): string {
    switch (estado) {
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

  formatearTamano(bytes: number): string {
    if (!bytes && bytes !== 0) {
      return '';
    }
    if (bytes < 1048576) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / 1048576).toFixed(1)} MB`;
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

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '';
    return this.formatearFecha(fecha.split(' ')[0]);
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
      Roles: d.roles_persona,
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
      Observaciones: d.observaciones,
    }));

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos');

    ws['!cols'] = [
      { wch: 32 }, { wch: 16 }, { wch: 22 }, { wch: 14 }, { wch: 20 },
      { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 24 }, { wch: 30 }, { wch: 10 }, { wch: 30 },
    ];

    const fechaActual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `documentos_registrados_${fechaActual}.xlsx`);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
}
