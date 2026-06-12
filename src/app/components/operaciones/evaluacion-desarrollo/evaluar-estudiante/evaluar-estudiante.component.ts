import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { UtilService } from '../../../../common/constantes/util.service';
import Swal from 'sweetalert2';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Ead3EvaluacionesService } from '../../../../services/ead3-evaluaciones.service';
import { Ead3ItemsService } from '../../../../services/ead3-items.service';

Chart.register(...registerables);

declare var ClassicEditor: any;

interface ItemEvaluacion {
  id: number;
  area: string;
  area_nombre: string;
  id_rango_edad: number;
  numero_item: number;
  descripcion: string;
  instrucciones: string | null;
  nombre_rango: string;
  orden: number;
  cumple: number | null;
}

@Component({
  selector: 'app-evaluar-estudiante',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FormsModule],
  templateUrl: './evaluar-estudiante.component.html',
  styleUrl: './evaluar-estudiante.component.scss'
})
export class EvaluarEstudianteComponent implements OnInit, OnDestroy {

  @ViewChild('graficoBarras') graficoBarrasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoRadar') graficoRadarCanvas!: ElementRef<HTMLCanvasElement>;

  titulo = 'Evaluación EAD-3';
  idEstudiante: number = 0;
  idEvaluacion: number | null = null;
  evaluacionCreada: boolean = false;
  modoRetomar: boolean = false;

  // Datos del estudiante
  nombreEstudiante: string = '';
  fechaNacimiento: string = '';
  edadMeses: number = 0;
  edadDias: number = 0;
  rangoEdad: any = null;

  // Wizard
  areas = ['MG', 'MF', 'AL', 'PS'];
  areaNombres: { [key: string]: string } = {
    'MG': 'Motricidad Gruesa',
    'MF': 'Motricidad Fino Adaptativa',
    'AL': 'Audición y Lenguaje',
    'PS': 'Personal Social'
  };
  areaIconos: { [key: string]: string } = {
    'MG': 'fas fa-running',
    'MF': 'fas fa-hand-paper',
    'AL': 'fas fa-comments',
    'PS': 'fas fa-users'
  };
  pasoActual: number = 0;
  areasGuardadas: { [key: string]: boolean } = { MG: false, MF: false, AL: false, PS: false };

  // Ítems
  itemsPorArea: { [key: string]: ItemEvaluacion[] } = {};
  todosLosItems: ItemEvaluacion[] = [];

  // Resultados - AGREGADO puntajesTipicos
  puntajesDirectos: { [key: string]: number } = { MG: 0, MF: 0, AL: 0, PS: 0 };
  puntajesTipicos: { [key: string]: number } = { MG: 0, MF: 0, AL: 0, PS: 0 };
  resultados: { [key: string]: string } = { MG: '', MF: '', AL: '', PS: '' };
  resultadoGlobal: string = '';
  observaciones: string = '';
  analisis: string = '';
  recomendaciones: string = '';

  // CKEditor
  private editorObservaciones: any = null;
  private editorAnalisis: any = null;
  private editorRecomendaciones: any = null;

  // Gráficos
  private chartBarras: Chart | null = null;
  private chartRadar: Chart | null = null;

  cargando: boolean = true;
  guardandoArea: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ead3EvaluacionesService: Ead3EvaluacionesService,
    private ead3ItemsService: Ead3ItemsService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.idEstudiante = +this.route.snapshot.params['idEstudiante'];
    const idRetomar = this.route.snapshot.queryParams['retomar'];

    if (idRetomar) {
      this.modoRetomar = true;
      this.cargarEvaluacionExistente(+idRetomar);
    } else {
      this.cargarDatosEstudiante();
    }
  }

  ngOnDestroy() {
    [this.editorObservaciones, this.editorAnalisis, this.editorRecomendaciones].forEach(ed => {
      if (ed) ed.destroy().catch(() => {});
    });
    if (this.chartBarras) this.chartBarras.destroy();
    if (this.chartRadar) this.chartRadar.destroy();
  }

  // --- NUEVA EVALUACIÓN ---
  cargarDatosEstudiante() {
    this.ead3EvaluacionesService.calcularEdad(this.idEstudiante).subscribe({
      next: (res: any) => {
        const data = res.body;
        this.fechaNacimiento = data.fecha_nacimiento;
        this.edadMeses = data.edad_meses;
        this.edadDias = data.edad_dias;
        this.rangoEdad = data.rango;
        this.nombreEstudiante = data.nombre_estudiante || '';
        this.titulo = `Evaluación EAD-3 — ${this.nombreEstudiante}`;
        this.cargarItems();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo obtener los datos del estudiante', 'error');
        this.router.navigate(['/operaciones/evaluacion-desarrollo']);
      }
    });
  }

  // --- RETOMAR EVALUACIÓN EXISTENTE ---
  cargarEvaluacionExistente(idEvaluacion: number) {
    this.ead3EvaluacionesService.retomar(idEvaluacion).subscribe({
      next: (res: any) => {
        const data = res.body;
        const ev = data.evaluacion;
        const itemsGuardados = data.items_guardados || [];
        const areasConDatos = data.areas_con_datos || {};

        // Cargar datos del estudiante desde la evaluación
        this.idEvaluacion = ev.id;
        this.idEstudiante = ev.id_estudiante;
        this.fechaNacimiento = ev.fecha_nacimiento;
        this.edadMeses = ev.edad_meses;
        this.edadDias = ev.edad_dias;
        this.rangoEdad = data.rango;
        this.nombreEstudiante = ev.nombre_estudiante || '';
        this.titulo = `Evaluación EAD-3 — ${this.nombreEstudiante} (Continuando)`;
        this.evaluacionCreada = true;

        // Cargar puntajes existentes
        this.puntajesDirectos = {
          MG: ev.puntaje_directo_mg || 0,
          MF: ev.puntaje_directo_mf || 0,
          AL: ev.puntaje_directo_al || 0,
          PS: ev.puntaje_directo_ps || 0
        };
        this.puntajesTipicos = {
          MG: ev.puntaje_tipico_mg || 0,
          MF: ev.puntaje_tipico_mf || 0,
          AL: ev.puntaje_tipico_al || 0,
          PS: ev.puntaje_tipico_ps || 0
        };
        this.resultados = {
          MG: ev.resultado_mg || '',
          MF: ev.resultado_mf || '',
          AL: ev.resultado_al || '',
          PS: ev.resultado_ps || ''
        };
        this.resultadoGlobal = ev.resultado_global || '';

        // Marcar áreas que ya tienen datos como guardadas
        this.areas.forEach(area => {
          if (areasConDatos[area] && areasConDatos[area] > 0) {
            this.areasGuardadas[area] = true;
          }
        });

        // Cargar ítems y aplicar las calificaciones previas
        this.cargarItemsConDatos(itemsGuardados);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar la evaluación. Se iniciará una nueva.', 'warning');
        this.modoRetomar = false;
        this.cargarDatosEstudiante();
      }
    });
  }

  cargarItems() {
    this.ead3ItemsService.obtenerItemsParaEvaluar(this.rangoEdad.id).subscribe({
      next: (res: any) => {
        this.todosLosItems = res.body.map((item: any) => ({ ...item, cumple: null }));
        this.areas.forEach(area => {
          this.itemsPorArea[area] = this.todosLosItems.filter(i => i.area === area);
        });
        this.cargando = false;
      }
    });
  }

  cargarItemsConDatos(itemsGuardados: any[]) {
    this.ead3ItemsService.obtenerItemsParaEvaluar(this.rangoEdad.id).subscribe({
      next: (res: any) => {
        // Crear mapa de ítems guardados por id_item
        const mapaGuardados: { [key: number]: number } = {};
        itemsGuardados.forEach(ig => {
          mapaGuardados[ig.id_item] = ig.cumple;
        });

        // Mapear todos los ítems y aplicar calificaciones previas
        this.todosLosItems = res.body.map((item: any) => ({
          ...item,
          cumple: mapaGuardados.hasOwnProperty(item.id) ? mapaGuardados[item.id] : null
        }));

        this.areas.forEach(area => {
          this.itemsPorArea[area] = this.todosLosItems.filter(i => i.area === area);
        });

        this.cargando = false;

        // Ir al primer área sin completar
        const primerAreaPendiente = this.areas.findIndex(a => !this.areasGuardadas[a]);
        if (primerAreaPendiente >= 0) {
          this.pasoActual = primerAreaPendiente + 1;
        } else {
          this.pasoActual = 5; // Todas guardadas, ir a resultados
        }

        Swal.fire({
          toast: true, position: 'top-end', icon: 'info',
          title: 'Evaluación cargada — continuando donde quedó',
          showConfirmButton: false, timer: 2500
        });
      }
    });
  }

  getEdadTexto(): string {
    if (this.edadMeses < 12) return `${this.edadMeses} meses`;
    const anios = Math.floor(this.edadMeses / 12);
    const meses = this.edadMeses % 12;
    return meses > 0 ? `${anios} años y ${meses} meses (${this.edadMeses} meses)` : `${anios} años (${this.edadMeses} meses)`;
  }

  // --- NAVEGACIÓN LIBRE ---
  irAPaso(paso: number) {
    if (paso === 0 || this.evaluacionCreada) {
      if (paso === 5) this.prepararResultados();
      this.pasoActual = paso;
    }
  }

  getAreaActual(): string {
    if (this.pasoActual >= 1 && this.pasoActual <= 4) return this.areas[this.pasoActual - 1];
    return '';
  }

  getItemsAreaActual(): ItemEvaluacion[] {
    return this.itemsPorArea[this.getAreaActual()] || [];
  }

  marcarItem(item: ItemEvaluacion, valor: number) {
    item.cumple = valor;
  }

  getItemsRespondidos(area: string): number {
    return (this.itemsPorArea[area] || []).filter(i => i.cumple !== null).length;
  }

  getTotalItems(area: string): number {
    return (this.itemsPorArea[area] || []).length;
  }

  areaCompleta(area: string): boolean {
    const items = this.itemsPorArea[area] || [];
    return items.length > 0 && items.every(i => i.cumple !== null);
  }

  getEstadoArea(area: string): string {
    if (this.areasGuardadas[area]) return 'finalizado';
    if (this.getItemsRespondidos(area) > 0) return 'en_proceso';
    return 'pendiente';
  }

  // --- PASO 0: INICIAR EVALUACIÓN ---
  iniciarEvaluacion() {
    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    this.ead3EvaluacionesService.iniciar({
      id_estudiante: this.idEstudiante,
      fecha_evaluacion: this.utilService.obtenerFechaActual(),
      edad_meses: this.edadMeses,
      edad_dias: this.edadDias,
      id_rango_edad: this.rangoEdad.id,
      id_usuario: idUsuario
    }).subscribe({
      next: (res: any) => {
        this.idEvaluacion = res.id;
        this.evaluacionCreada = true;
        this.pasoActual = 1;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Evaluación iniciada', showConfirmButton: false, timer: 1500 });
      },
      error: () => Swal.fire('Error', 'No se pudo iniciar la evaluación', 'error')
    });
  }

  // --- GUARDAR ÁREA - MODIFICADO PARA CAPTURAR PT ---
  guardarArea() {
    const area = this.getAreaActual();
    if (!area || !this.idEvaluacion) return;

    const items = (this.itemsPorArea[area] || [])
      .filter(i => i.cumple !== null)
      .map(i => ({ id_item: i.id, cumple: i.cumple }));

    if (items.length === 0) {
      Swal.fire('Sin datos', 'Debe evaluar al menos un ítem antes de guardar.', 'info');
      return;
    }

    this.guardandoArea = true;
    this.ead3EvaluacionesService.guardarArea({
      id_evaluacion: this.idEvaluacion,
      area: area,
      items: items
    }).subscribe({
      next: (res: any) => {
        this.areasGuardadas[area] = true;
        this.puntajesDirectos[area] = res.puntaje_directo;
        this.puntajesTipicos[area] = res.puntaje_tipico;  // ← NUEVO
        this.resultados[area] = res.resultado;
        
        // Actualizar resultado global si viene en la respuesta
        if (res.resultado_global) {
          this.resultadoGlobal = res.resultado_global;
        }
        
        this.guardandoArea = false;
        Swal.fire({ 
          toast: true, 
          position: 'top-end', 
          icon: 'success', 
          title: `${this.areaNombres[area]} guardada (PT: ${res.puntaje_tipico})`, 
          showConfirmButton: false, 
          timer: 2000 
        });
      },
      error: () => {
        this.guardandoArea = false;
        Swal.fire('Error', `No se pudo guardar ${this.areaNombres[area]}`, 'error');
      }
    });
  }

  // --- INSTRUCCIONES ---
  verInstrucciones(item: ItemEvaluacion) {
    Swal.fire({
      title: `Ítem ${item.numero_item}`,
      html: item.instrucciones || '<p class="text-muted">No hay instrucciones disponibles para este ítem.</p>',
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#00695C'
    });
  }

  // --- PASO 5: RESULTADOS ---
  prepararResultados() {
    this.calcularResultados();
    setTimeout(() => {
      this.crearGraficos();
      this.initEditor('editor-observaciones-eval', 'observaciones');
      this.initEditor('editor-analisis-eval', 'analisis');
      this.initEditor('editor-recomendaciones-eval', 'recomendaciones');
    }, 200);
  }

  calcularResultados() {
    // Los puntajes y resultados ya vienen del backend con la tabla de conversión
    // Solo calcular PD localmente para áreas no guardadas (preview)
    this.areas.forEach(area => {
      if (!this.areasGuardadas[area]) {
        const items = this.itemsPorArea[area] || [];
        this.puntajesDirectos[area] = items.filter(i => i.cumple === 1).length;
        // PT y clasificación se obtendrán cuando se guarde
      }
    });

    // Recalcular resultado global basado en los resultados guardados
    const resultadosArr = Object.values(this.resultados).filter(r => r);
    if (resultadosArr.length > 0) {
      if (resultadosArr.includes('rojo')) this.resultadoGlobal = 'rojo';
      else if (resultadosArr.includes('amarillo')) this.resultadoGlobal = 'amarillo';
      else this.resultadoGlobal = 'verde';
    }
  }

  crearGraficos() {
    if (this.chartBarras) { this.chartBarras.destroy(); this.chartBarras = null; }
    if (this.chartRadar) { this.chartRadar.destroy(); this.chartRadar = null; }

    if (!this.graficoBarrasCanvas || !this.graficoRadarCanvas) return;

    // Barras
    const ctxB = this.graficoBarrasCanvas.nativeElement.getContext('2d');
    if (ctxB) {
      const labels = this.areas.map(a => this.areaNombres[a]);
      const cumple = this.areas.map(a => (this.itemsPorArea[a] || []).filter(i => i.cumple === 1).length);
      const noCumple = this.areas.map(a => (this.itemsPorArea[a] || []).filter(i => i.cumple === 0).length);
      this.chartBarras = new Chart(ctxB, {
        type: 'bar',
        data: { labels, datasets: [
          { label: 'Cumple', data: cumple, backgroundColor: '#4CAF50', borderRadius: 4 },
          { label: 'No cumple', data: noCumple, backgroundColor: '#F44336', borderRadius: 4 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } }, title: { display: true, text: 'Ítems por Área (Puntaje Directo)' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
      });
    }

    // Radar - Usar PT
    const ctxR = this.graficoRadarCanvas.nativeElement.getContext('2d');
    if (ctxR) {
      const labels = this.areas.map(a => this.areaNombres[a]);
      const puntajesPT = this.areas.map(a => this.puntajesTipicos[a] || 0);
      
      this.chartRadar = new Chart(ctxR, {
        type: 'radar',
        data: { 
          labels, 
          datasets: [{
            label: 'Puntaje Típico',
            data: puntajesPT,
            backgroundColor: 'rgba(0, 105, 92, 0.2)',
            borderColor: '#00695C',
            pointBackgroundColor: this.areas.map(a => {
              const res = this.resultados[a];
              if (res === 'verde') return '#4CAF50';
              if (res === 'amarillo') return '#FF9800';
              if (res === 'rojo') return '#F44336';
              return '#9E9E9E';
            }),
            pointRadius: 6,
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false, 
          plugins: { 
            legend: { display: false }, 
            title: { display: true, text: 'Perfil de Desarrollo (Puntaje Típico)' }
          }, 
          scales: { 
            r: { 
              beginAtZero: true,
              suggestedMax: 100,
              ticks: { stepSize: 20 },
              pointLabels: { font: { size: 11 } }
            } 
          } 
        }
      });
    }
  }

  // --- FINALIZAR ---
  finalizar() {
    if (this.editorObservaciones) this.observaciones = this.editorObservaciones.getData();
    if (this.editorAnalisis) this.analisis = this.editorAnalisis.getData();
    if (this.editorRecomendaciones) this.recomendaciones = this.editorRecomendaciones.getData();

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    Swal.fire({
      title: '¿Finalizar evaluación?',
      text: 'Se guardarán los resultados, observaciones y análisis.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#00695C',
      cancelButtonColor: '#9E9E9E',
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ead3EvaluacionesService.finalizar({
          id: this.idEvaluacion,
          observaciones: this.observaciones,
          analisis: this.analisis || null,
          recomendaciones: this.recomendaciones || null,
          id_usuario_analisis: (this.analisis || this.recomendaciones) ? idUsuario : null
        }).subscribe({
          next: () => {
            Swal.fire('¡Finalizada!', 'La evaluación se registró correctamente.', 'success');
            this.router.navigate(['/operaciones/evaluacion-desarrollo/historial', this.idEstudiante]);
          },
          error: () => Swal.fire('Error', 'No se pudo finalizar la evaluación', 'error')
        });
      }
    });
  }

  // --- CKEDITOR ---
  initEditor(elementId: string, campo: string) {
    if (typeof ClassicEditor === 'undefined') { setTimeout(() => this.initEditor(elementId, campo), 500); return; }
    const el = document.querySelector(`#${elementId}`);
    if (!el) { setTimeout(() => this.initEditor(elementId, campo), 300); return; }
    ClassicEditor.create(el, {
      toolbar: { items: ['bold', 'italic', 'underline', '|', 'bulletedList', 'numberedList', '|', 'link', 'blockQuote', '|', 'undo', 'redo'] },
      language: 'es',
      placeholder: campo === 'observaciones' ? 'Observaciones generales...' : campo === 'analisis' ? 'Análisis profesional...' : 'Recomendaciones...'
    }).then((editor: any) => {
      if (campo === 'observaciones') this.editorObservaciones = editor;
      else if (campo === 'analisis') this.editorAnalisis = editor;
      else if (campo === 'recomendaciones') this.editorRecomendaciones = editor;
    });
  }

  // --- UTILIDADES ---
  getClaseSemaforo(resultado: string): string {
    return { 'verde': 'semaforo-verde', 'amarillo': 'semaforo-amarillo', 'rojo': 'semaforo-rojo' }[resultado] || '';
  }

  getTextoResultado(resultado: string): string {
    return { 'verde': 'Desarrollo esperado', 'amarillo': 'Riesgo de problemas', 'rojo': 'Sospecha de problemas' }[resultado] || 'Sin evaluar';
  }

  getIconoResultado(resultado: string): string {
    return { 'verde': 'fas fa-check-circle', 'amarillo': 'fas fa-exclamation-triangle', 'rojo': 'fas fa-times-circle' }[resultado] || 'fas fa-question-circle';
  }

  todasLasAreasGuardadas(): boolean {
    return this.areas.every(a => this.areasGuardadas[a]);
  }

  // NUEVO: Obtener texto con PD y PT
  getPuntajeTexto(area: string): string {
    const pd = this.puntajesDirectos[area] || 0;
    const pt = this.puntajesTipicos[area] || 0;
    if (this.areasGuardadas[area]) {
      return `PD: ${pd} → PT: ${pt}`;
    }
    return `PD: ${pd} (sin guardar)`;
  }
}