import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AsistenciaEstudiantesService } from '../../../services/asistencia-estudiantes.service';
import { HistorialRecordatoriosAsistenciaService } from '../../../services/historial-recordatorios-asistencia.service';
import { UtilService } from '../../../common/constantes/util.service';

interface AcudienteAsistencia {
  id_estudiante: number;
  id_persona: number;
  id_acudiente: number;
  id_tipo_acudiente: number;
  nombre_tipo_acudiente: string;
  id_persona_acudiente: number;
  nombre_acudiente: string;
  telefono: string;
  correo_electronico: string;
}

interface EstudianteIndicador {
  id_estudiante: number;
  id_persona: number;
  id_genero: number | null;
  nombre_completo: string;
  nombre_grupo: string;
  color_grupo: string;
  estado_hoy: string;
  dias_consecutivos_ausencia: number;
  asistencias_semana_actual: number;
  porcentaje_asistencia_semana: number;
  asistencias_mes_actual: number;
  porcentaje_asistencia_mes: number;
  promedio_horas_permanencia: number;
  total_asistencias: number;
  ultima_asistencia: string | null;
  clasificacion_riesgo: string;
  acudientes: AcudienteAsistencia[];
  ultimo_recordatorio: string | null;
}

@Component({
  selector: 'app-seguimiento-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './seguimiento-asistencia.component.html',
  styleUrl: './seguimiento-asistencia.component.scss'
})
export class SeguimientoAsistenciaComponent implements OnInit, OnDestroy {
  @ViewChild('tablaSeguimiento') tablaSeguimiento!: TablasComponent;

  titulo = "Seguimiento de Asistencia";

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtro de fecha
  public fechaReferencia: string = '';

  // Datos
  public estudiantes: EstudianteIndicador[] = [];
  public datosTabla: any[] = [];
  public titulosTabla: any[] = [];
  public columnasFiltro: string[] = [];
  public acudientes: AcudienteAsistencia[] = [];

  // Resumen
  public totalEstudiantes: number = 0;
  public totalPresentes: number = 0;
  public totalRiesgoAlto: number = 0;
  public totalRiesgoMedio: number = 0;

  // Modal detalle
  public estudianteSeleccionado: EstudianteIndicador | null = null;
  public telefonosEditables: string[] = [];
  public telefonoAdicional: string = '';
  public nombreAdicional: string = '';

  // Plantilla de mensaje editable
  public plantillaMensaje: string = '';
  public plantillaPorDefecto: string =
    `Hola *{nombre_acudiente}*, ¡un saludo de parte de *{nombre_colegio}*! 🌟\n\n` +
    `Nos comunicamos contigo porque hemos notado que *{nombre_estudiante}* no ha asistido al jardín en los últimos *{dias_ausencia} días* y {lo_la} extrañamos mucho en clase.\n\n` +
    `Su última asistencia fue el *{ultima_asistencia}* y queremos saber cómo se encuentra. Para nosotros es muy importante que los niños mantengan su proceso y sabemos que cada día cuenta en su desarrollo.\n\n` +
    `¿Está todo bien en casa? ¿Hay algo en lo que podamos apoyarte?\n\n` +
    `Quedamos atentos y con los brazos abiertos para recibir{lo_la} de vuelta. ¡Un abrazo! 💛`;

  public variablesDisponibles: { variable: string, descripcion: string }[] = [
    { variable: '{nombre_acudiente}', descripcion: 'Nombre del acudiente' },
    { variable: '{nombre_colegio}', descripcion: 'Nombre del colegio' },
    { variable: '{nombre_estudiante}', descripcion: 'Nombre del estudiante' },
    { variable: '{dias_ausencia}', descripcion: 'Días consecutivos de ausencia' },
    { variable: '{ultima_asistencia}', descripcion: 'Fecha de última asistencia' },
    { variable: '{porcentaje_mes}', descripcion: '% asistencia mensual' },
    { variable: '{promedio_horas}', descripcion: 'Promedio horas permanencia' },
    { variable: '{el_la}', descripcion: '"él" o "ella" según género' },
    { variable: '{lo_la}', descripcion: '"lo" o "la" según género' }
  ];

  public mostrarPlantilla: boolean = false;

  private nombreColegio: string = 'Liceo Lumen';

  constructor(
    private asistenciaService: AsistenciaEstudiantesService,
    private historialRecordatoriosService: HistorialRecordatoriosAsistenciaService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.fechaReferencia = this.obtenerFechaColombia();
    this.plantillaMensaje = this.plantillaPorDefecto;
    this.crearTitulosTabla();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  crearTitulosTabla(): void {
    this.titulosTabla = [
      { clave: 'nombre_completo', alias: 'Nombre Estudiante', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'estado_hoy', alias: 'Estado Hoy', alinear: 'centrado' },
      { clave: 'dias_consecutivos_ausencia', alias: 'Días Ausencia', alinear: 'centrado' },
      { clave: 'asistencias_semana_actual', alias: 'Asist. Semana', alinear: 'centrado' },
      { clave: 'asistencias_mes_actual', alias: 'Asist. Mes', alinear: 'centrado' },
      { clave: 'promedio_horas_permanencia', alias: 'Prom. Horas', alinear: 'centrado' },
      { clave: 'ultima_asistencia', alias: 'Última Asistencia', alinear: 'centrado' },
      { clave: 'clasificacion_riesgo', alias: 'Riesgo', alinear: 'centrado' },
      { clave: 'ultimo_recordatorio_fmt', alias: 'Último Envío', alinear: 'centrado' },
      { clave: 'id_estudiante', alias: 'WA', tipo: 'boton', alinear: 'centrado', iconoClase: 'fab fa-whatsapp', accionId: 'whatsapp', tooltip: 'Enviar seguimiento por WhatsApp' }
    ];

    this.columnasFiltro = ['Grupo', 'Estado Hoy', 'Riesgo'];
  }

  cargarDatos(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = this.asistenciaService.obtenerSeguimientoAsistencia(this.fechaReferencia).subscribe({
      next: (datos: any) => {
        if (datos && datos.indicadores && Array.isArray(datos.indicadores)) {
          this.acudientes = datos.acudientes || [];

          this.estudiantes = datos.indicadores.map((item: any) => ({
            ...item,
            id_genero: item.id_genero || null,
            promedio_horas_permanencia: item.promedio_horas_permanencia || 0,
            ultima_asistencia: item.ultima_asistencia || 'Sin registro',
            acudientes: this.obtenerAcudientesEstudiante(item.id_estudiante)
          }));

          this.datosTabla = this.estudiantes.map((est: EstudianteIndicador) => ({
            ...est,
            porcentaje_asistencia_semana: `${est.porcentaje_asistencia_semana}%`,
            porcentaje_asistencia_mes: `${est.porcentaje_asistencia_mes}%`,
            ultimo_recordatorio_fmt: est.ultimo_recordatorio
              ? this.formatearFechaHora(est.ultimo_recordatorio)
              : '-',
            color: this.obtenerColorPorRiesgo(est.clasificacion_riesgo)
          }));

          this.calcularResumen();
          this.datosDisponibles = true;
        } else {
          this.estudiantes = [];
          this.datosTabla = [];
          this.datosDisponibles = false;
        }

        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar datos:', error);
        this.estudiantes = [];
        this.datosTabla = [];
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });
    this.subscriptions.push(sub);
  }

  obtenerAcudientesEstudiante(idEstudiante: number): AcudienteAsistencia[] {
    return this.acudientes.filter(a => a.id_estudiante === idEstudiante);
  }

  calcularResumen(): void {
    this.totalEstudiantes = this.estudiantes.length;
    this.totalPresentes = this.estudiantes.filter(e => e.estado_hoy === 'Presente').length;
    this.totalRiesgoAlto = this.estudiantes.filter(e => e.clasificacion_riesgo === 'Alto').length;
    this.totalRiesgoMedio = this.estudiantes.filter(e => e.clasificacion_riesgo === 'Medio').length;
  }

  obtenerColorPorRiesgo(riesgo: string): string {
    switch (riesgo) {
      case 'Alto': return '#ffe6e6';
      case 'Medio': return '#fff3cd';
      case 'Bajo': return '#e8f5e8';
      default: return '';
    }
  }

  onFechaChange(): void {
    this.cargarDatos();
  }

  /**
   * Maneja el clic en el botón WA de la tabla
   */
  onClicAccion(evento: any): void {
    if (evento.accion === 'whatsapp') {
      const estudiante = this.estudiantes.find(e => e.id_estudiante === evento.registro.id_estudiante);
      if (estudiante) {
        this.verDetalle(estudiante);
      }
    }
  }

  verDetalle(estudiante: EstudianteIndicador): void {
    this.estudianteSeleccionado = estudiante;
    this.telefonoAdicional = '';
    this.nombreAdicional = '';
    this.telefonosEditables = estudiante.acudientes.map(a => a.telefono || '');

    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalSeguimiento'));
    modal.show();
  }

  /**
   * Obtiene el pronombre según género: 1=Femenino, 2=Masculino
   */
  obtenerElLa(idGenero: number | null): string {
    if (idGenero === 1) return 'ella';
    if (idGenero === 2) return 'él';
    return 'él/ella';
  }

  obtenerLoLa(idGenero: number | null): string {
    if (idGenero === 1) return 'la';
    if (idGenero === 2) return 'lo';
    return 'lo/la';
  }

  /**
   * Reemplaza las variables de la plantilla con los valores reales
   */
  resolverPlantilla(estudiante: EstudianteIndicador, nombreDestinatario: string): string {
    const nombreEstudiante = estudiante.nombre_completo.trim().replace(/\s+/g, ' ');
    const ultimaAsistencia = (estudiante.ultima_asistencia && estudiante.ultima_asistencia !== 'Sin registro')
      ? this.formatearFecha(estudiante.ultima_asistencia)
      : 'sin registro';

    let mensaje = this.plantillaMensaje;
    mensaje = mensaje.replace(/\{nombre_acudiente\}/g, nombreDestinatario);
    mensaje = mensaje.replace(/\{nombre_colegio\}/g, this.nombreColegio);
    mensaje = mensaje.replace(/\{nombre_estudiante\}/g, nombreEstudiante);
    mensaje = mensaje.replace(/\{dias_ausencia\}/g, String(estudiante.dias_consecutivos_ausencia));
    mensaje = mensaje.replace(/\{ultima_asistencia\}/g, ultimaAsistencia);
    mensaje = mensaje.replace(/\{porcentaje_mes\}/g, `${estudiante.porcentaje_asistencia_mes}%`);
    mensaje = mensaje.replace(/\{promedio_horas\}/g, String(estudiante.promedio_horas_permanencia));
    mensaje = mensaje.replace(/\{el_la\}/g, this.obtenerElLa(estudiante.id_genero));
    mensaje = mensaje.replace(/\{lo_la\}/g, this.obtenerLoLa(estudiante.id_genero));

    return mensaje;
  }

  /**
   * Inserta una variable en la posición del cursor del textarea
   */
  insertarVariable(variable: string): void {
    const textarea = document.getElementById('plantillaTextarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const texto = this.plantillaMensaje;
      this.plantillaMensaje = texto.substring(0, start) + variable + texto.substring(end);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
      }, 0);
    }
  }

  restaurarPlantilla(): void {
    this.plantillaMensaje = this.plantillaPorDefecto;
  }

  togglePlantilla(): void {
    this.mostrarPlantilla = !this.mostrarPlantilla;
  }

  enviarWhatsApp(estudiante: EstudianteIndicador, acudiente: AcudienteAsistencia, indice: number): void {
    const telefono = this.telefonosEditables[indice];
    if (!telefono) {
      alert('Ingrese un número de teléfono para enviar el recordatorio.');
      return;
    }

    const mensaje = this.resolverPlantilla(estudiante, acudiente.nombre_acudiente);
    const telefonoLimpio = this.limpiarTelefono(telefono);

    this.guardarHistorialSilencioso(estudiante, acudiente.id_persona_acudiente, telefonoLimpio, acudiente.nombre_acudiente);

    const url = `https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  enviarWhatsAppTelefonoAdicional(estudiante: EstudianteIndicador): void {
    if (!this.telefonoAdicional) {
      alert('Ingrese un número de teléfono.');
      return;
    }

    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const mensaje = this.resolverPlantilla(estudiante, nombre);
    const telefonoLimpio = this.limpiarTelefono(this.telefonoAdicional);

    this.guardarHistorialSilencioso(estudiante, null, telefonoLimpio, nombre);

    const url = `https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  }

  private guardarHistorialSilencioso(
    estudiante: EstudianteIndicador,
    idPersonaAcudiente: number | null,
    telefono: string,
    nombreDestinatario: string
  ): void {
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    const registro = {
      id_estudiante: estudiante.id_estudiante,
      id_persona_acudiente: idPersonaAcudiente,
      telefono_usado: telefono,
      nombre_destinatario: nombreDestinatario,
      tipo_recordatorio: estudiante.clasificacion_riesgo.toLowerCase(),
      dias_ausencia: estudiante.dias_consecutivos_ausencia,
      porcentaje_asistencia_mes: estudiante.porcentaje_asistencia_mes,
      clasificacion_riesgo: estudiante.clasificacion_riesgo,
      id_usuario: idUsuario
    };

    this.historialRecordatoriosService.crear(registro).subscribe({
      next: () => {
        estudiante.ultimo_recordatorio = new Date().toISOString();
      },
      error: (error: any) => {
        console.error('Error al guardar historial de recordatorio:', error);
      }
    });
  }

  limpiarTelefono(telefono: string): string {
    return telefono.replace(/[\s\-\(\)\+]/g, '').replace(/^57/, '');
  }

  formatearFecha(fecha: string): string {
    try {
      const [year, month, day] = fecha.substring(0, 10).split('-');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return fecha;
    }
  }

  formatearFechaHora(fecha: string): string {
    try {
      const d = new Date(fecha);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).substring(2);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return fecha;
    }
  }

  private obtenerFechaColombia(): string {
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}