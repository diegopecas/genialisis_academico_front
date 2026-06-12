import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObservacionesEstudiantesService } from '../../../../services/observaciones-estudiantes.service';
import { TiposObservacionesEstudiantesService } from '../../../../services/tipos-observaciones-estudiantes.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { ExportarPdfObservacionesService, DatosObservacionesPDF } from '../../../../services/exportar-pdf-observaciones.service';

@Component({
  selector: 'app-estudiante-observaciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-observaciones.component.html',
  styleUrl: './estudiante-observaciones.component.scss'
})
export class EstudianteObservacionesComponent implements OnInit {
  @Input() idEstudiante: string = '';

  // Propiedades del estudiante
  public estudiante: any;
  public nombreCompleto: string = '';

  // Datos de observaciones
  public observaciones: any[] = [];
  public observacionesOriginales: any[] = [];
  public observacionesFiltradas: any[] = [];
  public tiposObservaciones: any[] = [];

  // Separación por año académico
  public anioAcademico: number = new Date().getFullYear();
  public subTabObservaciones: 'actual' | 'historico' = 'actual';
  public observacionesAnioActual: any[] = [];
  public observacionesHistoricas: any[] = [];

  // Estado de la UI
  public cargando: boolean = true;

  // Variables para buscar y filtrar
  public searchTerm: string = '';
  public filtroTipos: string[] = [];
  public filtroFechas: string[] = [];
  public filtroUsuarios: string[] = [];

  // Estados para menús de filtro
  public mostrarFiltroTipos: boolean = false;
  public mostrarFiltroFechas: boolean = false;
  public mostrarFiltroUsuarios: boolean = false;

  // Variables para búsqueda dentro de cada filtro
  public busquedaTipos: string = '';
  public busquedaFechas: string = '';
  public busquedaUsuarios: string = '';

  // Opciones para filtros
  public opcionesTipos: string[] = [];
  public opcionesFechas: string[] = [];
  public opcionesUsuarios: string[] = [];

  // Paginación
  public paginacion = {
    paginaActual: 1,
    itemsPorPagina: 10
  };
  public totalPaginas: number = 1;

  // Mapeo de colores para tipos de observación
  private tiposColores: { [key: string]: string } = {
    'Comportamiento': '#e74c3c',
    'Académica': '#3498db',
    'Felicitación': '#2ecc71',
    'Llamado de atención': '#f39c12',
    'Disciplinaria': '#e67e22',
    'Asistencia': '#1abc9c',
    'Compromiso': '#9b59b6'
  };

  constructor(
    private observacionesService: ObservacionesEstudiantesService,
    private tiposObservacionesService: TiposObservacionesEstudiantesService,
    private estudiantesService: EstudiantesService,
    private institucionConfigService: InstitucionConfigService,
    private exportarPdfObservacionesService: ExportarPdfObservacionesService
  ) { }

  ngOnInit(): void {
    this.anioAcademico = this.institucionConfigService.getAnioAcademicoActual();

    if (this.idEstudiante && this.idEstudiante !== "0") {
      this.obtenerEstudiante(this.idEstudiante);
      this.cargarObservaciones();
    }
  }

  obtenerEstudiante(idEstudiante: string): void {
    this.estudiantesService.obtenerById(idEstudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.estudiante = body[0];

        this.nombreCompleto = [
          this.estudiante.primer_nombre,
          this.estudiante.segundo_nombre,
          this.estudiante.primer_apellido,
          this.estudiante.segundo_apellido
        ].filter(Boolean).join(' ');
      },
      error: (error) => {
        console.error('Error al obtener datos del estudiante:', error);
      }
    });
  }

  cargarObservaciones(): void {
    if (!this.idEstudiante) return;

    this.cargando = true;

    this.tiposObservacionesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tiposObservaciones = response.body;

        this.observacionesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
          next: (obsResponse: any) => {
            const datos = obsResponse.body;

            const observacionesProcesadas = datos.map((obs: any) => {
              const tipo = this.tiposObservaciones.find(t => t.id === obs.id_tipo_observacion_estudiante);
              const fechaFormateada = this.formatearFecha(obs.fecha);

              return {
                ...obs,
                nombre_tipo_observacion: tipo ? tipo.nombre : 'Desconocido',
                fechaFormateada: fechaFormateada,
                tieneEstudianteAfectado: !!obs.id_estudiante_afectado,
                tieneFirma: !!obs.firma_informe_padre
              };
            });

            observacionesProcesadas.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            this.observacionesOriginales = [...observacionesProcesadas];

            // Separar por año académico
            this.separarPorAnio();

            // Extraer opciones de filtro basadas en el sub-tab activo
            this.actualizarOpcionesFiltros();

            this.filtrarObservaciones();

            this.cargando = false;
          },
          error: (error) => {
            console.error('Error al cargar observaciones:', error);
            this.cargando = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar tipos de observaciones:', error);
        this.cargando = false;
      }
    });
  }

  // Separar observaciones por año académico
  private separarPorAnio(): void {
    this.observacionesAnioActual = this.observacionesOriginales.filter(obs => {
      const anioObs = new Date(obs.fecha).getFullYear();
      return anioObs === this.anioAcademico;
    });

    this.observacionesHistoricas = this.observacionesOriginales.filter(obs => {
      const anioObs = new Date(obs.fecha).getFullYear();
      return anioObs < this.anioAcademico;
    });
  }

  // Obtener datos base según sub-tab activo
  obtenerDatosBase(): any[] {
    return this.subTabObservaciones === 'actual'
      ? this.observacionesAnioActual
      : this.observacionesHistoricas;
  }

  // Cambiar sub-tab
  cambiarSubTab(tab: 'actual' | 'historico'): void {
    this.subTabObservaciones = tab;
    this.paginacion.paginaActual = 1;
    this.actualizarOpcionesFiltros();
    this.filtrarObservaciones();
  }

  // Actualizar opciones de filtros según datos del sub-tab activo
  private actualizarOpcionesFiltros(): void {
    const datosBase = this.obtenerDatosBase();

    const tiposUnicos = new Set<string>();
    const fechasUnicas = new Set<string>();
    const usuariosUnicos = new Set<string>();

    datosBase.forEach(obs => {
      if (obs.nombre_tipo_observacion) tiposUnicos.add(obs.nombre_tipo_observacion);
      if (obs.fechaFormateada) fechasUnicas.add(obs.fechaFormateada);
      const nombreUsuario = obs.nombre_usuario || 'Usuario del sistema';
      usuariosUnicos.add(nombreUsuario);
    });

    this.opcionesTipos = Array.from(tiposUnicos).sort();
    this.opcionesFechas = Array.from(fechasUnicas).sort((a, b) => {
      const [diaA, mesA, anioA] = a.split('/').map(Number);
      const [diaB, mesB, anioB] = b.split('/').map(Number);
      if (anioA !== anioB) return anioB - anioA;
      if (mesA !== mesB) return mesB - mesA;
      return diaB - diaA;
    });
    this.opcionesUsuarios = Array.from(usuariosUnicos).sort();

    // Limpiar filtros que ya no aplican al nuevo sub-tab
    this.filtroTipos = this.filtroTipos.filter(t => this.opcionesTipos.includes(t));
    this.filtroFechas = this.filtroFechas.filter(f => this.opcionesFechas.includes(f));
    this.filtroUsuarios = this.filtroUsuarios.filter(u => this.opcionesUsuarios.includes(u));
  }

  // Métodos para filtrado de observaciones
  filtrarObservaciones(): void {
    let resultado = [...this.obtenerDatosBase()];

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase();
      resultado = resultado.filter(obs =>
        (obs.nombre_tipo_observacion || '').toLowerCase().includes(termino) ||
        (obs.descripcion || '').toLowerCase().includes(termino) ||
        (obs.nombre_usuario || '').toLowerCase().includes(termino)
      );
    }

    if (this.filtroTipos.length > 0) {
      resultado = resultado.filter(obs =>
        this.filtroTipos.includes(obs.nombre_tipo_observacion)
      );
    }

    if (this.filtroFechas.length > 0) {
      resultado = resultado.filter(obs =>
        this.filtroFechas.includes(obs.fechaFormateada)
      );
    }

    if (this.filtroUsuarios.length > 0) {
      resultado = resultado.filter(obs => {
        const nombreUsuario = obs.nombre_usuario || 'Usuario del sistema';
        return this.filtroUsuarios.includes(nombreUsuario);
      });
    }

    resultado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    this.observacionesFiltradas = [...resultado];

    this.totalPaginas = Math.ceil(this.observacionesFiltradas.length / this.paginacion.itemsPorPagina);

    if (this.paginacion.paginaActual > this.totalPaginas) {
      this.paginacion.paginaActual = 1;
    }

    this.aplicarPaginacion();
  }

  // Métodos para control de paginación
  aplicarPaginacion(): void {
    const inicio = (this.paginacion.paginaActual - 1) * this.paginacion.itemsPorPagina;
    const fin = inicio + this.paginacion.itemsPorPagina;
    this.observaciones = [...this.observacionesFiltradas].slice(inicio, fin);
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginacion.paginaActual = nuevaPagina;
    this.filtrarObservaciones();
  }

  cambiarPaginacion(): void {
    this.paginacion.paginaActual = 1;
    this.filtrarObservaciones();
  }

  // Métodos para controlar filtros
  toggleFiltroTipos(): void {
    this.mostrarFiltroTipos = !this.mostrarFiltroTipos;
    this.mostrarFiltroFechas = false;
    this.mostrarFiltroUsuarios = false;
  }

  toggleFiltroFechas(): void {
    this.mostrarFiltroFechas = !this.mostrarFiltroFechas;
    this.mostrarFiltroTipos = false;
    this.mostrarFiltroUsuarios = false;
  }

  toggleFiltroUsuarios(): void {
    this.mostrarFiltroUsuarios = !this.mostrarFiltroUsuarios;
    this.mostrarFiltroTipos = false;
    this.mostrarFiltroFechas = false;
  }

  toggleTipo(tipo: string): void {
    const index = this.filtroTipos.indexOf(tipo);
    if (index === -1) {
      this.filtroTipos.push(tipo);
    } else {
      this.filtroTipos.splice(index, 1);
    }
    this.filtrarObservaciones();
  }

  toggleFecha(fecha: string): void {
    const index = this.filtroFechas.indexOf(fecha);
    if (index === -1) {
      this.filtroFechas.push(fecha);
    } else {
      this.filtroFechas.splice(index, 1);
    }
    this.filtrarObservaciones();
  }

  toggleUsuario(usuario: string): void {
    const index = this.filtroUsuarios.indexOf(usuario);
    if (index === -1) {
      this.filtroUsuarios.push(usuario);
    } else {
      this.filtroUsuarios.splice(index, 1);
    }
    this.filtrarObservaciones();
  }

  // Métodos para seleccionar todos los filtros
  seleccionarTodosTipos(seleccionado: boolean): void {
    if (seleccionado) {
      this.filtroTipos = [...this.obtenerOpcionesTiposFiltradas()];
    } else {
      this.filtroTipos = [];
    }
    this.filtrarObservaciones();
  }

  seleccionarTodasFechas(seleccionado: boolean): void {
    if (seleccionado) {
      this.filtroFechas = [...this.obtenerOpcionesFechasFiltradas()];
    } else {
      this.filtroFechas = [];
    }
    this.filtrarObservaciones();
  }

  seleccionarTodosUsuarios(seleccionado: boolean): void {
    if (seleccionado) {
      this.filtroUsuarios = [...this.obtenerOpcionesUsuariosFiltrados()];
    } else {
      this.filtroUsuarios = [];
    }
    this.filtrarObservaciones();
  }

  seleccionarTodosTiposEvent(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.seleccionarTodosTipos(checkbox?.checked || false);
  }

  seleccionarTodasFechasEvent(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.seleccionarTodasFechas(checkbox?.checked || false);
  }

  seleccionarTodosUsuariosEvent(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    this.seleccionarTodosUsuarios(checkbox?.checked || false);
  }

  todasSeleccionadasTipos(): boolean {
    const opcionesFiltradas = this.obtenerOpcionesTiposFiltradas();
    if (opcionesFiltradas.length === 0) return false;
    return opcionesFiltradas.every(tipo => this.filtroTipos.includes(tipo));
  }

  todasSeleccionadasFechas(): boolean {
    const opcionesFiltradas = this.obtenerOpcionesFechasFiltradas();
    if (opcionesFiltradas.length === 0) return false;
    return opcionesFiltradas.every(fecha => this.filtroFechas.includes(fecha));
  }

  todasSeleccionadasUsuarios(): boolean {
    const opcionesFiltradas = this.obtenerOpcionesUsuariosFiltrados();
    if (opcionesFiltradas.length === 0) return false;
    return opcionesFiltradas.every(usuario => this.filtroUsuarios.includes(usuario));
  }

  obtenerOpcionesTiposFiltradas(): string[] {
    if (!this.busquedaTipos || this.busquedaTipos.trim() === '') {
      return this.opcionesTipos;
    }
    const busqueda = this.busquedaTipos.toLowerCase();
    return this.opcionesTipos.filter(tipo => tipo.toLowerCase().includes(busqueda));
  }

  obtenerOpcionesFechasFiltradas(): string[] {
    if (!this.busquedaFechas || this.busquedaFechas.trim() === '') {
      return this.opcionesFechas;
    }
    const busqueda = this.busquedaFechas.toLowerCase();
    return this.opcionesFechas.filter(fecha => fecha.toLowerCase().includes(busqueda));
  }

  obtenerOpcionesUsuariosFiltrados(): string[] {
    if (!this.busquedaUsuarios || this.busquedaUsuarios.trim() === '') {
      return this.opcionesUsuarios;
    }
    const busqueda = this.busquedaUsuarios.toLowerCase();
    return this.opcionesUsuarios.filter(usuario => usuario.toLowerCase().includes(busqueda));
  }

  limpiarFiltroTipos(): void {
    this.filtroTipos = [];
    this.filtrarObservaciones();
  }

  limpiarFiltroFechas(): void {
    this.filtroFechas = [];
    this.filtrarObservaciones();
  }

  limpiarFiltroUsuarios(): void {
    this.filtroUsuarios = [];
    this.filtrarObservaciones();
  }

  obtenerTextoFiltroTipos(): string {
    if (this.filtroTipos.length === 0) {
      return 'Tipo: Todos';
    } else if (this.filtroTipos.length === this.opcionesTipos.length) {
      return 'Tipo: Todos';
    } else {
      return `Tipo: ${this.filtroTipos.length} seleccionado(s)`;
    }
  }

  obtenerTextoFiltroFechas(): string {
    if (this.filtroFechas.length === 0) {
      return 'Fecha: Todas';
    } else if (this.filtroFechas.length === this.opcionesFechas.length) {
      return 'Fecha: Todas';
    } else if (this.filtroFechas.length === 1) {
      return `Fecha: ${this.filtroFechas[0]}`;
    } else {
      return `Fecha: ${this.filtroFechas.length} seleccionada(s)`;
    }
  }

  obtenerTextoFiltroUsuarios(): string {
    if (this.filtroUsuarios.length === 0) {
      return 'Usuario: Todos';
    } else if (this.filtroUsuarios.length === this.opcionesUsuarios.length) {
      return 'Usuario: Todos';
    } else if (this.filtroUsuarios.length === 1) {
      return `Usuario: ${this.filtroUsuarios[0]}`;
    } else {
      return `Usuario: ${this.filtroUsuarios.length} seleccionado(s)`;
    }
  }

  estaSeleccionado(array: string[], valor: string): boolean {
    return array.includes(valor);
  }

  obtenerColorTipo(tipo: string): string {
    return this.tiposColores[tipo] || '#6c757d';
  }

  obtenerIniciales(texto: string): string {
    if (!texto) return '';
    return texto.split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    const dia = date.getDate().toString().padStart(2, '0');
    const mes = (date.getMonth() + 1).toString().padStart(2, '0');
    const anio = date.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  obtenerPeriodoObservaciones(): string {
    const datosBase = this.obtenerDatosBase();
    if (datosBase.length === 0) {
      return 'Sin observaciones';
    }

    const observacionesOrdenadas = [...datosBase].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    const primeraFecha = this.formatearFecha(observacionesOrdenadas[0].fecha);
    const ultimaFecha = this.formatearFecha(
      observacionesOrdenadas[observacionesOrdenadas.length - 1].fecha
    );

    return `${primeraFecha} - ${ultimaFecha}`;
  }

  // Exportar a PDF
  async exportarPDF(): Promise<void> {
    try {
      const logoBase64 = await this.cargarLogoBase64();

      const datosPDF: DatosObservacionesPDF = {
        nombreEstudiante: this.nombreCompleto || 'N/A',
        numeroIdentificacion: this.estudiante?.numero_identificacion,
        nombreGrupo: this.estudiante?.nombre_grupo,
        logoBase64: logoBase64,
        anioAcademico: this.anioAcademico,
        subTabActivo: this.subTabObservaciones,
        observacionesOriginales: this.obtenerDatosBase(),
        observacionesFiltradas: this.observacionesFiltradas,
        periodoObservaciones: this.obtenerPeriodoObservaciones(),
        filtrosAplicados: {
          tipos: this.filtroTipos,
          fechas: this.filtroFechas,
          usuarios: this.filtroUsuarios,
          busqueda: this.searchTerm
        }
      };

      this.exportarPdfObservacionesService.generarPDF(datosPDF);
      console.log('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  // Obtener datos para exportar
  obtenerDatosObservacionesParaExportar(): any[] {
    let resultado = [...this.obtenerDatosBase()];

    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const termino = this.searchTerm.toLowerCase();
      resultado = resultado.filter(obs =>
        (obs.nombre_tipo_observacion || '').toLowerCase().includes(termino) ||
        (obs.descripcion || '').toLowerCase().includes(termino) ||
        (obs.nombre_usuario || '').toLowerCase().includes(termino)
      );
    }

    if (this.filtroTipos.length > 0) {
      resultado = resultado.filter(obs =>
        this.filtroTipos.includes(obs.nombre_tipo_observacion)
      );
    }

    if (this.filtroFechas.length > 0) {
      resultado = resultado.filter(obs =>
        this.filtroFechas.includes(obs.fechaFormateada)
      );
    }

    if (this.filtroUsuarios.length > 0) {
      resultado = resultado.filter(obs => {
        const nombreUsuario = obs.nombre_usuario || 'Usuario del sistema';
        return this.filtroUsuarios.includes(nombreUsuario);
      });
    }

    resultado.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    return resultado.map((obs, i) => {
      let textoEstudianteAfectado = '-';
      if (obs.nombre_estudiante_afectado && obs.nombre_estudiante_afectado.trim() !== '') {
        textoEstudianteAfectado = obs.nombre_estudiante_afectado.trim();
      } else if (obs.id_estudiante_afectado) {
        textoEstudianteAfectado = 'Otro estudiante';
      }

      return {
        id: (i + 1).toString(),
        fecha: obs.fechaFormateada,
        tipo: obs.nombre_tipo_observacion || 'N/A',
        descripcion: obs.descripcion || 'Sin descripción',
        estudiante_afectado: textoEstudianteAfectado,
        usuario: obs.nombre_usuario || 'Usuario del sistema'
      };
    });
  }

  // Compartir por WhatsApp
  compartirPorWhatsApp(): void {
    const observacionesExportar = this.obtenerDatosObservacionesParaExportar();
    const tabLabel = this.subTabObservaciones === 'actual'
      ? `Año ${this.anioAcademico}`
      : 'Años anteriores';

    let mensaje = `*Historial de Observaciones - ${this.institucionConfigService.getNombreInstitucion()}*\n`;
    mensaje += `📆 Fecha: ${new Date().toLocaleDateString('es-CO')}\n`;
    mensaje += `👨‍🎓 Estudiante: ${this.nombreCompleto}\n`;
    mensaje += `📂 Período: ${tabLabel}\n\n`;

    mensaje += `*Resumen de Observaciones*\n`;
    mensaje += `📝 Total (${tabLabel}): ${this.obtenerDatosBase().length}\n`;
    mensaje += `🔍 Filtradas: ${observacionesExportar.length}\n`;
    mensaje += `⏱️ Período: ${this.obtenerPeriodoObservaciones()}\n\n`;

    let tieneAlgunFiltro = this.filtroTipos.length > 0 || this.filtroFechas.length > 0 ||
      this.filtroUsuarios.length > 0 || (this.searchTerm && this.searchTerm.trim() !== '');

    if (tieneAlgunFiltro) {
      mensaje += `*Filtros Aplicados*\n`;

      if (this.filtroTipos.length > 0) {
        mensaje += `📋 Tipos: ${this.filtroTipos.join(', ')}\n`;
      }

      if (this.filtroFechas.length > 0) {
        if (this.filtroFechas.length <= 3) {
          mensaje += `📅 Fechas: ${this.filtroFechas.join(', ')}\n`;
        } else {
          mensaje += `📅 Fechas: ${this.filtroFechas.length} seleccionadas\n`;
        }
      }

      if (this.filtroUsuarios.length > 0) {
        mensaje += `👤 Usuarios: ${this.filtroUsuarios.join(', ')}\n`;
      }

      if (this.searchTerm && this.searchTerm.trim() !== '') {
        mensaje += `🔍 Búsqueda: "${this.searchTerm}"\n`;
      }

      mensaje += `\n`;
    }

    const maxObservaciones = Math.min(5, observacionesExportar.length);

    if (observacionesExportar.length > 0) {
      mensaje += `*Observaciones:*\n\n`;

      for (let i = 0; i < maxObservaciones; i++) {
        const obs = observacionesExportar[i];
        mensaje += `*${i + 1}. ${obs.fecha} - ${obs.tipo}*\n`;
        mensaje += `${obs.descripcion}\n`;

        if (obs.estudiante_afectado && obs.estudiante_afectado !== '-') {
          mensaje += `👥 Estudiante Afectado: ${obs.estudiante_afectado}\n`;
        }

        mensaje += `👤 Registrada por: ${obs.usuario}\n\n`;
      }

      if (observacionesExportar.length > maxObservaciones) {
        mensaje += `... y ${observacionesExportar.length - maxObservaciones} más observaciones\n\n`;
      }
    } else {
      mensaje += `*No hay observaciones* que coincidan con los filtros aplicados.\n\n`;
    }

    mensaje += `Este mensaje ha sido generado automáticamente. Para más detalles, consulte con ${this.institucionConfigService.getNombreInstitucion()}.`;

    const mensajeCodificado = encodeURIComponent(mensaje);
    const urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`;
    window.open(urlWhatsApp, '_blank');
  }
}