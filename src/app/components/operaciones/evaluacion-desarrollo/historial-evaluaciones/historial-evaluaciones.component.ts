import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { UtilService } from '../../../../common/constantes/util.service';
import Swal from 'sweetalert2';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Ead3EvaluacionesService } from '../../../../services/ead3-evaluaciones.service';

Chart.register(...registerables);

declare var ClassicEditor: any;

@Component({
  selector: 'app-historial-evaluaciones',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule],
  templateUrl: './historial-evaluaciones.component.html',
  styleUrl: './historial-evaluaciones.component.scss'
})
export class HistorialEvaluacionesComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('graficoBarras') graficoBarrasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoRadar') graficoRadarCanvas!: ElementRef<HTMLCanvasElement>;

  titulo = 'Historial EAD-3';
  idEstudiante: string = '';
  nombreEstudiante: string = '';
  evaluaciones: any[] = [];
  evaluacionSeleccionada: any = null;
  detalleItems: any[] = [];
  detalleItemsFiltrados: any[] = [];
  busquedaDetalle: string = '';
  filtroCumple: string = 'todos'; // 'todos' | 'cumple' | 'no_cumple'
  cargando: boolean = true;
  acordeonAbierto: { [key: string]: boolean } = {};

  // Editores CKEditor
  private editorObservaciones: any = null;
  private editorAnalisis: any = null;
  private editorRecomendaciones: any = null;
  editandoObservaciones: boolean = false;
  editandoAnalisis: boolean = false;

  // Gráficos
  private chartBarras: Chart | null = null;
  private chartRadar: Chart | null = null;

  areas = ['MG', 'MF', 'AL', 'PS'];

  areaNombres: { [key: string]: string } = {
    'MG': 'Motricidad Gruesa',
    'MF': 'Motricidad Fino Adaptativa',
    'AL': 'Audición y Lenguaje',
    'PS': 'Personal Social'
  };

  areaNombresCortos: { [key: string]: string } = {
    'MG': 'Mot. Gruesa',
    'MF': 'Mot. Fina',
    'AL': 'Aud. y Leng.',
    'PS': 'Personal Social'
  };

  areaIconos: { [key: string]: string } = {
    'MG': 'fas fa-running',
    'MF': 'fas fa-hand-paper',
    'AL': 'fas fa-comments',
    'PS': 'fas fa-users'
  };

  // Colores Materialize
  colores: { [key: string]: string } = {
    'verde': '#4CAF50',
    'amarillo': '#FF9800',
    'rojo': '#F44336'
  };

  coloresClaro: { [key: string]: string } = {
    'verde': '#C8E6C9',
    'amarillo': '#FFE0B2',
    'rojo': '#FFCDD2'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ead3Service: Ead3EvaluacionesService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.idEstudiante = this.route.snapshot.params['idEstudiante'];
    this.cargarHistorial();
  }

  ngAfterViewInit() { }

  ngOnDestroy() {
    this.destruirEditores();
    this.destruirGraficos();
  }

  destruirEditores() {
    [this.editorObservaciones, this.editorAnalisis, this.editorRecomendaciones].forEach(editor => {
      if (editor) editor.destroy().catch((e: any) => console.error(e));
    });
    this.editorObservaciones = null;
    this.editorAnalisis = null;
    this.editorRecomendaciones = null;
  }

  destruirGraficos() {
    if (this.chartBarras) { this.chartBarras.destroy(); this.chartBarras = null; }
    if (this.chartRadar) { this.chartRadar.destroy(); this.chartRadar = null; }
  }

  cargarHistorial() {
    this.ead3Service.obtenerByEstudiante(this.idEstudiante).subscribe({
      next: (res: any) => {
        this.evaluaciones = res.body || [];
        if (this.evaluaciones.length > 0) {
          this.nombreEstudiante = (this.evaluaciones[0].nombre_estudiante || '').replace(/\s+/g, ' ').trim();
          this.titulo = `Historial EAD-3 — ${this.nombreEstudiante}`;
        }
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  verDetalle(evaluacion: any) {
    // Si está en proceso/iniciado, no abrir detalle — solo continuar
    if (evaluacion.estado === 'iniciado' || evaluacion.estado === 'en_proceso') {
      return;
    }

    if (this.evaluacionSeleccionada?.id === evaluacion.id) {
      this.cerrarDetalle();
      return;
    }
    this.destruirEditores();
    this.destruirGraficos();
    this.evaluacionSeleccionada = evaluacion;
    this.busquedaDetalle = '';
    this.filtroCumple = 'todos';
    this.acordeonAbierto = {};
    this.editandoObservaciones = false;
    this.editandoAnalisis = false;
    this.areas.forEach(a => this.acordeonAbierto[a] = true);

    this.ead3Service.obtenerDetalle(evaluacion.id).subscribe({
      next: (res: any) => {
        this.detalleItems = res.body || [];
        this.aplicarFiltros();
        setTimeout(() => this.crearGraficos(), 200);
      }
    });
  }

  cerrarDetalle() {
    this.destruirEditores();
    this.destruirGraficos();
    this.evaluacionSeleccionada = null;
    this.detalleItems = [];
    this.detalleItemsFiltrados = [];
    this.busquedaDetalle = '';
    this.filtroCumple = 'todos';
    this.editandoObservaciones = false;
    this.editandoAnalisis = false;
  }

  // --- CONTINUAR EVALUACIÓN ---
  continuarEvaluacion(evaluacion: any, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/operaciones/evaluacion-desarrollo/evaluar', this.idEstudiante], {
      queryParams: { retomar: evaluacion.id }
    });
  }

  // --- ESTADO ---
  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'iniciado': return 'Iniciada';
      case 'en_proceso': return 'En proceso';
      case 'finalizado': return 'Finalizada';
      default: return 'Finalizada';
    }
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'iniciado': return 'badge-estado-iniciado';
      case 'en_proceso': return 'badge-estado-proceso';
      case 'finalizado': return 'badge-estado-finalizado';
      default: return 'badge-estado-finalizado';
    }
  }

  esEvaluacionActiva(evaluacion: any): boolean {
    return evaluacion.estado === 'iniciado' || evaluacion.estado === 'en_proceso';
  }

  // --- FILTROS ---
  aplicarFiltros() {
    let items = [...this.detalleItems];

    // Filtro cumple/no cumple
    if (this.filtroCumple === 'cumple') {
      items = items.filter(i => i.cumple === 1);
    } else if (this.filtroCumple === 'no_cumple') {
      items = items.filter(i => i.cumple === 0);
    }

    // Filtro búsqueda
    if (this.busquedaDetalle.trim()) {
      const termino = this.busquedaDetalle.toLowerCase();
      items = items.filter(i => i.descripcion_item?.toLowerCase().includes(termino));
      this.areas.forEach(a => this.acordeonAbierto[a] = true);
    }

    this.detalleItemsFiltrados = items;
  }

  filtrarItems() { this.aplicarFiltros(); }
  cambiarFiltroCumple(filtro: string) { this.filtroCumple = filtro; this.aplicarFiltros(); }

  getItemsPorArea(area: string): any[] {
    return this.detalleItemsFiltrados.filter(item => item.area === area);
  }

  toggleAcordeon(area: string) {
    this.acordeonAbierto[area] = !this.acordeonAbierto[area];
  }

  // --- EDITAR ÍTEM (CON CONFIRMACIÓN) ---
  toggleItem(det: any) {
    const nuevoCumple = det.cumple === 1 ? 0 : 1;
    const accion = nuevoCumple === 1 ? 'marcar como <strong>cumple</strong>' : 'marcar como <strong>no cumple</strong>';

    Swal.fire({
      title: '¿Cambiar calificación?',
      html: `¿Desea ${accion} este ítem?<br><small class="text-muted">${det.descripcion_item}</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: nuevoCumple === 1 ? '#4CAF50' : '#F44336',
      cancelButtonColor: '#9E9E9E',
      confirmButtonText: nuevoCumple === 1 ? 'Sí, cumple' : 'Sí, no cumple',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ead3Service.actualizarItem({
          id_evaluacion: this.evaluacionSeleccionada.id,
          id_detalle: det.id,
          cumple: nuevoCumple
        }).subscribe({
          next: (res: any) => {
            det.cumple = nuevoCumple;
            if (res.puntajes) {
              Object.keys(res.puntajes).forEach(key => {
                this.evaluacionSeleccionada['resultado_' + key] = res.puntajes[key];
              });
            }
            if (res.resultado_global) {
              this.evaluacionSeleccionada.resultado_global = res.resultado_global;
            }
            this.recalcularPuntajesLocales();
            this.destruirGraficos();
            setTimeout(() => this.crearGraficos(), 200);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ítem actualizado', showConfirmButton: false, timer: 1500 });
          },
          error: () => Swal.fire('Error', 'No se pudo actualizar el ítem.', 'error')
        });
      }
    });
  }

  recalcularPuntajesLocales() {
    this.areas.forEach(area => {
      const items = this.detalleItems.filter(i => i.area === area);
      const pd = items.filter(i => i.cumple === 1).length;
      this.evaluacionSeleccionada['puntaje_directo_' + area.toLowerCase()] = pd;
    });
  }

  // --- GRÁFICOS ---
  crearGraficos() {
    this.crearGraficoBarras();
    this.crearGraficoRadar();
  }

  crearGraficoBarras() {
    if (!this.graficoBarrasCanvas) return;
    const ctx = this.graficoBarrasCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.areas.map(a => this.areaNombresCortos[a]);
    const cumple: number[] = [];
    const noCumple: number[] = [];

    this.areas.forEach(area => {
      const items = this.detalleItems.filter(i => i.area === area);
      cumple.push(items.filter(i => i.cumple === 1).length);
      noCumple.push(items.filter(i => i.cumple === 0).length);
    });

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Cumple', data: cumple, backgroundColor: '#4CAF50', borderRadius: 4 },
          { label: 'No cumple', data: noCumple, backgroundColor: '#F44336', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
          title: { display: true, text: 'Ítems por Área', font: { size: 13 } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1 } }
        }
      }
    };

    this.chartBarras = new Chart(ctx, config);
  }

  crearGraficoRadar() {
    if (!this.graficoRadarCanvas) return;
    const ctx = this.graficoRadarCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.areas.map(a => this.areaNombresCortos[a]);
    const porcentajes: number[] = [];

    this.areas.forEach(area => {
      const items = this.detalleItems.filter(i => i.area === area);
      const total = items.length;
      const cumplidos = items.filter(i => i.cumple === 1).length;
      porcentajes.push(total > 0 ? Math.round((cumplidos / total) * 100) : 0);
    });

    const config: ChartConfiguration = {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: '% Cumplimiento',
          data: porcentajes,
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          borderColor: '#4CAF50',
          pointBackgroundColor: porcentajes.map(p => p >= 70 ? '#4CAF50' : p >= 40 ? '#FF9800' : '#F44336'),
          pointBorderColor: '#fff',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Perfil de Desarrollo', font: { size: 13 } }
        },
        scales: {
          r: { beginAtZero: true, max: 100, ticks: { stepSize: 25, font: { size: 10 } } }
        }
      }
    };

    this.chartRadar = new Chart(ctx, config);
  }

  // --- OBSERVACIONES ---
  toggleEditarObservaciones() {
    if (this.editandoObservaciones) {
      this.guardarObservaciones();
    } else {
      this.editandoObservaciones = true;
      setTimeout(() => this.initEditor('editor-observaciones', 'observaciones'), 100);
    }
  }

  guardarObservaciones() {
    if (this.editorObservaciones) {
      this.evaluacionSeleccionada.observaciones = this.editorObservaciones.getData();
    }
    this.ead3Service.actualizarObservaciones(
      this.evaluacionSeleccionada.id,
      this.evaluacionSeleccionada.observaciones
    ).subscribe({
      next: () => {
        this.editandoObservaciones = false;
        if (this.editorObservaciones) { this.editorObservaciones.destroy().catch(() => {}); this.editorObservaciones = null; }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Observaciones guardadas', showConfirmButton: false, timer: 1500 });
      }
    });
  }

  // --- ANÁLISIS PROFESIONAL ---
  toggleEditarAnalisis() {
    if (this.editandoAnalisis) {
      this.guardarAnalisis();
    } else {
      this.editandoAnalisis = true;
      setTimeout(() => {
        this.initEditor('editor-analisis', 'analisis');
        this.initEditor('editor-recomendaciones', 'recomendaciones');
      }, 100);
    }
  }

  guardarAnalisis() {
    if (this.editorAnalisis) this.evaluacionSeleccionada.analisis = this.editorAnalisis.getData();
    if (this.editorRecomendaciones) this.evaluacionSeleccionada.recomendaciones = this.editorRecomendaciones.getData();
    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    this.ead3Service.actualizarAnalisis({
      id: this.evaluacionSeleccionada.id,
      analisis: this.evaluacionSeleccionada.analisis || '',
      recomendaciones: this.evaluacionSeleccionada.recomendaciones || '',
      id_usuario_analisis: idUsuario!
    }).subscribe({
      next: () => {
        this.editandoAnalisis = false;
        [this.editorAnalisis, this.editorRecomendaciones].forEach(ed => { if (ed) ed.destroy().catch(() => {}); });
        this.editorAnalisis = null;
        this.editorRecomendaciones = null;
        this.cargarHistorial();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Análisis guardado', showConfirmButton: false, timer: 1500 });
      }
    });
  }

  // --- CKEDITOR INIT ---
  initEditor(elementId: string, campo: string) {
    if (typeof ClassicEditor === 'undefined') { setTimeout(() => this.initEditor(elementId, campo), 500); return; }
    const el = document.querySelector(`#${elementId}`);
    if (!el) { setTimeout(() => this.initEditor(elementId, campo), 300); return; }
    ClassicEditor.create(el, {
      toolbar: { items: ['bold', 'italic', 'underline', '|', 'bulletedList', 'numberedList', '|', 'link', 'blockQuote', '|', 'undo', 'redo'] },
      language: 'es',
      placeholder: campo === 'observaciones' ? 'Escriba las observaciones...' :
        campo === 'analisis' ? 'Escriba el análisis profesional...' : 'Escriba las recomendaciones...'
    }).then((editor: any) => {
      if (campo === 'observaciones') this.editorObservaciones = editor;
      else if (campo === 'analisis') this.editorAnalisis = editor;
      else if (campo === 'recomendaciones') this.editorRecomendaciones = editor;
      if (this.evaluacionSeleccionada[campo]) editor.setData(this.evaluacionSeleccionada[campo]);
    });
  }

  // --- NAVEGACIÓN ---
  nuevaEvaluacion() {
    this.router.navigate(['/operaciones/evaluacion-desarrollo/evaluar', this.idEstudiante]);
  }

  anularEvaluacion(evaluacion: any, event: Event) {
    event.stopPropagation();
    Swal.fire({
      title: '¿Anular evaluación?', text: 'Esta acción no se puede deshacer', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#F44336', cancelButtonColor: '#9E9E9E',
      confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ead3Service.anular(evaluacion.id).subscribe({
          next: () => {
            Swal.fire('Anulada', 'La evaluación fue anulada.', 'success');
            this.cerrarDetalle();
            this.cargarHistorial();
          }
        });
      }
    });
  }

  // --- UTILIDADES ---
  getClaseSemaforo(resultado: string): string {
    return { 'verde': 'badge-verde', 'amarillo': 'badge-amarillo', 'rojo': 'badge-rojo' }[resultado] || '';
  }

  getTextoResultado(resultado: string): string {
    return { 'verde': 'Esperado', 'amarillo': 'Riesgo', 'rojo': 'Sospecha' }[resultado] || '';
  }

  getColorArea(area: string): string {
    if (!this.evaluacionSeleccionada) return '';
    return this.evaluacionSeleccionada['resultado_' + area.toLowerCase()] || '';
  }

  resaltarBusqueda(texto: string): string {
    if (!this.busquedaDetalle.trim() || !texto) return texto;
    const termino = this.busquedaDetalle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return texto.replace(new RegExp(`(${termino})`, 'gi'), '<mark>$1</mark>');
  }

  getTotalCumple(): number { return this.detalleItems.filter(i => i.cumple === 1).length; }
  getTotalNoCumple(): number { return this.detalleItems.filter(i => i.cumple === 0).length; }
}