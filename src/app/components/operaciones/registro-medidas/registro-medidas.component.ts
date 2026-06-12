import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { HeaderComponent } from '../../../common/header/header.component';
import { AsistenciaEstudiantesService } from '../../../services/asistencia-estudiantes.service';
import { GruposService } from '../../../services/grupos.service';
import { MedidasXEstudianteService } from '../../../services/medidas-x-estudiante.service';
import { CategoriasMedidasService } from '../../../services/categorias-medidas.service';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { UtilService } from '../../../common/constantes/util.service';

interface MedidaCatalogo {
  id: number;
  nombre: string;
  id_categoria: number;
  unidad_abreviatura: string;
  tipo_valor: string;
  opciones?: { id: number; valor_numerico: number; etiqueta: string }[];
  seleccionada: boolean;
}

interface CategoriaMedida {
  id: number;
  nombre: string;
  icono: string;
  medidas: MedidaCatalogo[];
  abierta: boolean;
  todasSeleccionadas: boolean;
}

interface MedidaEstudiante {
  id_medida: number;
  valor: number | null;
  id_registro: number | null;
  id_documento_persona: number | null;
  valor_anterior: number | null;
  fecha_anterior: string | null;
  prellenado_ia: boolean;
}

interface EstudianteFila {
  id: number;
  id_persona: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nombre_completo: string;
  nombre_grupo: string;
  icono: string;
  color: string;
  medidas: Map<number, MedidaEstudiante>;
  archivo: File | null;
  imagenUrl: string | null;
  analizandoIA: boolean;
  id_documento_persona: number | null;
  visible: boolean;
}

@Component({
  selector: 'app-registro-medidas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './registro-medidas.component.html',
  styleUrl: './registro-medidas.component.scss'
})
export class RegistroMedidasComponent implements OnInit, OnDestroy {
  titulo = "Registro de Medidas";
  pasoActual: 1 | 2 = 1;

  // Paso 1
  categorias: CategoriaMedida[] = [];
  busquedaMedida = '';
  categoriasFiltradas: CategoriaMedida[] = [];
  totalMedidasSeleccionadas = 0;
  cargandoCategorias = false;

  // Paso 2
  fechaSeleccionada: string = this.obtenerFechaHoy();
  grupoSeleccionado = '';
  busquedaEstudiante = '';
  busquedaMedidaMobile = '';
  grupos: any[] = [];
  estudiantes: EstudianteFila[] = [];
  estudiantesFiltrados: EstudianteFila[] = [];
  cargandoEstudiantes = false;
  registrando = false;
  medidasSeleccionadas: MedidaCatalogo[] = [];
  medidasFiltradasMobile: MedidaCatalogo[] = [];

  // Modal imagen
  imagenModalUrl: string | null = null;
  imagenModalNombre = '';
  imagenModalDescargarUrl: string | null = null;

  private busquedaMedidaSubject = new Subject<string>();
  private busquedaEstudianteSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private asistenciaService: AsistenciaEstudiantesService,
    private gruposService: GruposService,
    private medidasXEstudianteService: MedidasXEstudianteService,
    private categoriasMedidasService: CategoriasMedidasService,
    private documentosService: DocumentosPersonasService,
    private institucionConfigService: InstitucionConfigService,
    private utilService: UtilService
  ) {
    this.configurarDebounce();
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.obtenerGrupos();
  }

  ngOnDestroy(): void {
    this.busquedaMedidaSubject.complete();
    this.busquedaEstudianteSubject.complete();
    this.subscriptions.forEach(s => s.unsubscribe());
    // Liberar URLs de imágenes
    this.estudiantes.forEach(est => {
      if (est.imagenUrl) URL.revokeObjectURL(est.imagenUrl);
    });
  }

  private configurarDebounce(): void {
    this.busquedaMedidaSubject.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.filtrarMedidas());
    this.busquedaEstudianteSubject.pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => this.aplicarFiltrosEstudiantes());
  }

  obtenerFechaHoy(): string {
    const f = new Date();
    return `${f.getFullYear()}-${(f.getMonth() + 1).toString().padStart(2, '0')}-${f.getDate().toString().padStart(2, '0')}`;
  }

  // ============================================
  // PASO 1
  // ============================================

  cargarCategorias(): void {
    this.cargandoCategorias = true;
    this.categoriasMedidasService.obtenerConMedidas().subscribe({
      next: (data: any[]) => {
        this.categorias = data.map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          icono: cat.icono || 'fas fa-ruler',
          abierta: true,
          todasSeleccionadas: false,
          medidas: (cat.medidas || []).map((m: any) => ({
            id: m.id,
            nombre: m.nombre,
            id_categoria: m.id_categoria,
            unidad_abreviatura: m.unidad_abreviatura || '',
            tipo_valor: m.tipo_valor || 'numerico',
            opciones: m.opciones || [],
            seleccionada: false
          }))
        }));
        this.categoriasFiltradas = [...this.categorias];
        this.cargandoCategorias = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargandoCategorias = false;
        Swal.fire('Error', 'No se pudieron cargar las medidas disponibles', 'error');
      }
    });
  }

  onBusquedaMedidaCambiada(): void {
    this.busquedaMedidaSubject.next(this.busquedaMedida);
  }

  filtrarMedidas(): void {
    if (!this.busquedaMedida.trim()) {
      this.categoriasFiltradas = [...this.categorias];
      return;
    }
    const termino = this.normalizarTexto(this.busquedaMedida);
    this.categoriasFiltradas = this.categorias
      .map(cat => ({ ...cat, abierta: true, medidas: cat.medidas.filter(m => this.normalizarTexto(m.nombre).includes(termino)) }))
      .filter(cat => cat.medidas.length > 0);
  }

  toggleMedida(medida: MedidaCatalogo): void {
    medida.seleccionada = !medida.seleccionada;
    this.actualizarConteoSeleccionadas();
  }

  toggleCategoria(categoria: CategoriaMedida): void {
    categoria.abierta = !categoria.abierta;
  }

  seleccionarTodasCategoria(categoria: CategoriaMedida): void {
    const nuevoEstado = !categoria.todasSeleccionadas;
    categoria.todasSeleccionadas = nuevoEstado;
    categoria.medidas.forEach(m => m.seleccionada = nuevoEstado);
    this.actualizarConteoSeleccionadas();
  }

  seleccionarTodas(): void {
    const hayAlgunaNo = this.categorias.some(c => c.medidas.some(m => !m.seleccionada));
    this.categorias.forEach(c => {
      c.todasSeleccionadas = hayAlgunaNo;
      c.medidas.forEach(m => m.seleccionada = hayAlgunaNo);
    });
    this.actualizarConteoSeleccionadas();
  }

  limpiarSeleccion(): void {
    this.categorias.forEach(c => {
      c.todasSeleccionadas = false;
      c.medidas.forEach(m => m.seleccionada = false);
    });
    this.actualizarConteoSeleccionadas();
  }

  private actualizarConteoSeleccionadas(): void {
    this.totalMedidasSeleccionadas = this.categorias.reduce((t, c) => t + c.medidas.filter(m => m.seleccionada).length, 0);
    this.categorias.forEach(cat => {
      cat.todasSeleccionadas = cat.medidas.length > 0 && cat.medidas.every(m => m.seleccionada);
    });
  }

  contarSeleccionadasCategoria(categoria: CategoriaMedida): number {
    return categoria.medidas.filter(m => m.seleccionada).length;
  }

  irAPaso2(): void {
    if (this.totalMedidasSeleccionadas === 0) {
      Swal.fire('Atención', 'Selecciona al menos una medida para continuar', 'warning');
      return;
    }
    this.medidasSeleccionadas = this.categorias.flatMap(c => c.medidas.filter(m => m.seleccionada));
    this.medidasFiltradasMobile = [...this.medidasSeleccionadas];
    this.pasoActual = 2;
    this.cargarEstudiantes();
  }

  volverAPaso1(): void {
    this.pasoActual = 1;
  }

  // ============================================
  // PASO 2
  // ============================================

  obtenerGrupos(): void {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => { this.grupos = response.body || []; },
      error: (error) => { console.error('Error al obtener grupos:', error); }
    });
  }

  cargarEstudiantes(): void {
    this.cargandoEstudiantes = true;
    this.asistenciaService.obtenerEstudiantesPorFecha(this.fechaSeleccionada).subscribe({
      next: (estudiantesData: any[]) => {
        this.estudiantes = estudiantesData.map(est => ({
          id: est.id_estudiante,
          id_persona: est.id_persona || 0,
          primer_nombre: est.primer_nombre || '',
          segundo_nombre: est.segundo_nombre || '',
          primer_apellido: est.primer_apellido || '',
          segundo_apellido: est.segundo_apellido || '',
          nombre_completo: [est.primer_nombre, est.segundo_nombre, est.primer_apellido, est.segundo_apellido].filter(Boolean).join(' '),
          nombre_grupo: est.nombre_grupo || 'Sin grupo',
          icono: est.icono || '/assets/images/estudiante-default.png',
          color: est.color || '#007bff',
          medidas: new Map<number, MedidaEstudiante>(),
          archivo: null,
          imagenUrl: null,
          analizandoIA: false,
          id_documento_persona: null,
          visible: true
        }));
        this.inicializarMedidasEstudiantes();
        this.cargarMedidasExistentes();
      },
      error: (error: any) => {
        console.error('Error al cargar estudiantes:', error);
        this.cargandoEstudiantes = false;
        Swal.fire('Error', 'No se pudieron cargar los estudiantes', 'error');
      }
    });
  }

  private inicializarMedidasEstudiantes(): void {
    this.estudiantes.forEach(est => {
      this.medidasSeleccionadas.forEach(medida => {
        est.medidas.set(medida.id, {
          id_medida: medida.id, valor: null, id_registro: null,
          id_documento_persona: null, valor_anterior: null, fecha_anterior: null, prellenado_ia: false
        });
      });
    });
  }

  private cargarMedidasExistentes(): void {
    if (this.estudiantes.length === 0) {
      this.cargandoEstudiantes = false;
      this.aplicarFiltrosEstudiantes();
      return;
    }
    const ids = this.estudiantes.map(e => e.id);
    const medidasIds = this.medidasSeleccionadas.map(m => m.id);

    this.medidasXEstudianteService.obtenerMedidasMultiplesEstudiantes(ids, this.fechaSeleccionada, medidasIds)
      .subscribe({
        next: (response: any) => {
          (response.estudiantes || []).forEach((estData: any) => {
            const estudiante = this.estudiantes.find(e => e.id == estData.id_estudiante);
            if (!estudiante) return;
            // Imagen del reporte guardada previamente
            if (estData.id_documento_persona) {
              estudiante.id_documento_persona = estData.id_documento_persona;
              estudiante.imagenUrl = this.documentosService.obtenerUrlDescarga(estData.id_documento_persona);
            }
            (estData.medidas || []).forEach((medData: any) => {
              const medida = estudiante.medidas.get(medData.id_medida);
              if (medida) {
                medida.valor = medData.valor_actual;
                medida.id_registro = medData.id_registro_actual;
                medida.id_documento_persona = medData.id_documento_persona;
                medida.valor_anterior = medData.valor_anterior;
                medida.fecha_anterior = medData.fecha_anterior;
              }
            });
          });
          this.cargandoEstudiantes = false;
          this.aplicarFiltrosEstudiantes();
        },
        error: () => {
          this.cargandoEstudiantes = false;
          this.aplicarFiltrosEstudiantes();
        }
      });
  }

  onFechaCambiada(): void { this.cargarEstudiantes(); }
  onGrupoCambiado(): void { this.aplicarFiltrosEstudiantes(); }
  onBusquedaEstudianteCambiada(): void { this.busquedaEstudianteSubject.next(this.busquedaEstudiante); }

  onBusquedaMedidaMobileCambiada(): void {
    if (!this.busquedaMedidaMobile.trim()) {
      this.medidasFiltradasMobile = [...this.medidasSeleccionadas];
      return;
    }
    const termino = this.normalizarTexto(this.busquedaMedidaMobile);
    this.medidasFiltradasMobile = this.medidasSeleccionadas.filter(m => this.normalizarTexto(m.nombre).includes(termino));
  }

  private aplicarFiltrosEstudiantes(): void {
    this.estudiantesFiltrados = this.estudiantes.filter(est => {
      const pasaGrupo = !this.grupoSeleccionado || est.nombre_grupo === this.obtenerNombreGrupo();
      const pasaBusqueda = !this.busquedaEstudiante || this.normalizarTexto(est.nombre_completo).includes(this.normalizarTexto(this.busquedaEstudiante));
      est.visible = pasaGrupo && pasaBusqueda;
      return est.visible;
    });
  }

  private obtenerNombreGrupo(): string {
    const grupo = this.grupos.find(g => g.id.toString() === this.grupoSeleccionado);
    return grupo ? grupo.nombre : '';
  }

  limpiarFiltrosEstudiantes(): void {
    this.grupoSeleccionado = '';
    this.busquedaEstudiante = '';
    this.aplicarFiltrosEstudiantes();
  }

  // ============================================
  // VALORES
  // ============================================

  obtenerValorMedida(estudiante: EstudianteFila, idMedida: number): number | null {
    return estudiante.medidas.get(idMedida)?.valor ?? null;
  }

  onValorCambiado(estudiante: EstudianteFila, idMedida: number, event: any): void {
    const medida = estudiante.medidas.get(idMedida);
    if (!medida) return;
    const valor = parseFloat(event.target.value);
    medida.valor = isNaN(valor) ? null : valor;
    medida.prellenado_ia = false;
  }

  onSelectCambiado(estudiante: EstudianteFila, idMedida: number, event: any): void {
    const medida = estudiante.medidas.get(idMedida);
    if (!medida) return;
    const valor = parseFloat(event.target.value);
    medida.valor = isNaN(valor) ? null : valor;
    medida.prellenado_ia = false;
  }

  onSelectModelCambiado(estudiante: EstudianteFila, idMedida: number, valor: any): void {
    const medida = estudiante.medidas.get(idMedida);
    if (!medida) return;
    medida.valor = valor !== null && valor !== undefined ? Number(valor) : null;
    medida.prellenado_ia = false;
  }

  esPrellenadoIA(estudiante: EstudianteFila, idMedida: number): boolean {
    return estudiante.medidas.get(idMedida)?.prellenado_ia || false;
  }

  obtenerValorAnterior(estudiante: EstudianteFila, idMedida: number): MedidaEstudiante | null {
    const medida = estudiante.medidas.get(idMedida);
    return medida && medida.valor_anterior !== null ? medida : null;
  }

  // ============================================
  // IA + IMAGEN
  // ============================================

  onArchivoSeleccionado(estudiante: EstudianteFila, event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Error', 'El archivo no puede superar 10MB', 'error');
      event.target.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['jpg', 'jpeg', 'png'].includes(ext)) {
      Swal.fire('Error', 'Solo se permiten archivos JPG, JPEG o PNG', 'error');
      event.target.value = '';
      return;
    }

    estudiante.archivo = file;
    // Crear URL para thumbnail/preview
    if (estudiante.imagenUrl) URL.revokeObjectURL(estudiante.imagenUrl);
    estudiante.imagenUrl = URL.createObjectURL(file);
    estudiante.analizandoIA = true;

    // Construir medidas para el prompt incluyendo opciones de select
    const medidasParaIA = this.medidasSeleccionadas.map(m => {
      const info: any = { id: m.id, nombre: m.nombre };
      if (m.tipo_valor === 'select' && m.opciones && m.opciones.length > 0) {
        info.opciones = m.opciones.map(o => ({ valor_numerico: o.valor_numerico, etiqueta: o.etiqueta }));
      }
      return info;
    });

    this.medidasXEstudianteService.analizarReporteMedidas(file, medidasParaIA).subscribe({
      next: (respuesta: any) => {
        estudiante.analizandoIA = false;
        if (respuesta.success && respuesta.datos) {
          const medidasIA = respuesta.datos.medidas || [];
          medidasIA.forEach((mIA: any) => {
            const medida = estudiante.medidas.get(mIA.id_medida);
            if (medida && mIA.valor !== null) {
              medida.valor = mIA.valor;
              medida.prellenado_ia = true;
            }
          });
        }
      },
      error: (error) => {
        estudiante.analizandoIA = false;
        console.error('Error al analizar reporte:', error);
        Swal.fire('Advertencia', 'No se pudieron extraer los datos de la imagen. Ingrese los valores manualmente.', 'warning');
      }
    });
  }

  eliminarArchivo(estudiante: EstudianteFila): void {
    if (estudiante.imagenUrl) URL.revokeObjectURL(estudiante.imagenUrl);
    estudiante.archivo = null;
    estudiante.imagenUrl = null;
    estudiante.id_documento_persona = null;
    const input = document.getElementById('archivo_' + estudiante.id) as HTMLInputElement;
    if (input) input.value = '';
    const inputM = document.getElementById('archivo_m_' + estudiante.id) as HTMLInputElement;
    if (inputM) inputM.value = '';
  }

  abrirImagenModal(estudiante: EstudianteFila): void {
    if (estudiante.imagenUrl) {
      this.imagenModalUrl = estudiante.imagenUrl;
      this.imagenModalNombre = estudiante.nombre_completo;
      this.imagenModalDescargarUrl = estudiante.id_documento_persona
        ? this.documentosService.obtenerUrlDescarga(estudiante.id_documento_persona)
        : null;
    }
  }

  cerrarImagenModal(): void {
    this.imagenModalUrl = null;
    this.imagenModalNombre = '';
    this.imagenModalDescargarUrl = null;
  }

  // ============================================
  // REGISTRO MASIVO
  // ============================================

  get estudiantesConDatos(): EstudianteFila[] {
    return this.estudiantes.filter(est => {
      for (const [, medida] of est.medidas) {
        if (medida.valor !== null && medida.valor !== undefined) return true;
      }
      return false;
    });
  }

  get totalMedidasARegistrar(): number {
    let total = 0;
    this.estudiantesConDatos.forEach(est => {
      est.medidas.forEach(m => { if (m.valor !== null && m.valor !== undefined) total++; });
    });
    return total;
  }

  async registrarMedidas(): Promise<void> {
    const estudiantesParaRegistrar = this.estudiantesConDatos;
    if (estudiantesParaRegistrar.length === 0) {
      Swal.fire('Atención', 'No hay medidas para registrar', 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      title: 'Confirmar registro',
      html: `¿Registrar <strong>${this.totalMedidasARegistrar}</strong> medidas para <strong>${estudiantesParaRegistrar.length}</strong> estudiantes?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) return;
    this.registrando = true;

    try {
      for (const est of estudiantesParaRegistrar.filter(e => e.archivo)) {
        try {
          est.id_documento_persona = await this.subirDocumento(est);
        } catch (error) {
          console.error('Error al subir documento de', est.nombre_completo, error);
        }
      }

      const registros = estudiantesParaRegistrar.map(est => {
        const medidas: any[] = [];
        est.medidas.forEach(m => {
          if (m.valor !== null && m.valor !== undefined) {
            medidas.push({ id_medida: m.id_medida, valor: m.valor, id_registro: m.id_registro });
          }
        });
        return { id_estudiante: est.id, id_documento_persona: est.id_documento_persona, medidas };
      });

      this.medidasXEstudianteService.registrarMasivo({
        fecha: this.fechaSeleccionada,
        id_usuario: this.utilService.obtenerIdUsuarioActual(),
        registros
      }).subscribe({
        next: (respuesta: any) => {
          this.registrando = false;
          if (respuesta.success) {
            Swal.fire({
              title: '¡Medidas registradas!',
              html: `Se procesaron <strong>${respuesta.insertados + respuesta.actualizados}</strong> medidas.`
                + (respuesta.insertados > 0 ? `<br>Nuevas: ${respuesta.insertados}` : '')
                + (respuesta.actualizados > 0 ? `<br>Actualizadas: ${respuesta.actualizados}` : ''),
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => this.cargarEstudiantes());
          } else {
            Swal.fire('Advertencia', respuesta.message || 'Algunos registros fallaron', 'warning');
          }
        },
        error: () => {
          this.registrando = false;
          Swal.fire('Error', 'Hubo un problema al registrar las medidas', 'error');
        }
      });
    } catch (error) {
      this.registrando = false;
      Swal.fire('Error', 'Error inesperado al procesar', 'error');
    }
  }

  private subirDocumento(estudiante: EstudianteFila): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!estudiante.archivo) { resolve(0); return; }
      const formData = new FormData();
      formData.append('archivo', estudiante.archivo);
      formData.append('id_persona', estudiante.id_persona.toString());
      formData.append('id_tipo_documento', '34');
      formData.append('observaciones', `Reporte báscula - ${estudiante.nombre_completo} - ${this.fechaSeleccionada}`);
      const idUsuario = this.utilService.obtenerIdUsuarioActual();
      if (idUsuario) formData.append('id_usuario_subio', idUsuario.toString());

      this.documentosService.subirDocumento(formData).subscribe({
        next: (response: any) => resolve(response.id || response.body?.id || 0),
        error: (error) => reject(error)
      });
    });
  }

  // ============================================
  // UTILIDADES
  // ============================================

  trackByEstudiante(index: number, est: EstudianteFila): number { return est.id; }
  trackByMedida(index: number, medida: MedidaCatalogo): number { return medida.id; }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}