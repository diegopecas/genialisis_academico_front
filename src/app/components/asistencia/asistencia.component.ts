import { Component, OnInit } from '@angular/core';
import { EstudiantesService } from '../../services/estudiantes.service';
import { AsistenciaEstudiantesService } from '../../services/asistencia-estudiantes.service';
import { ConstantesService } from '../../common/constantes/constantes.service';
import { ObservacionesEstudiantesService } from '../../services/observaciones-estudiantes.service';
import { AcudientesService } from '../../services/acudientes.service';
import { PersonasService } from '../../services/personas.service';
import { AutorizadosRecogerService } from '../../services/autorizados-recoger.service';
import { MotorCobrosAutomaticosService } from '../../services/motor-cobros-automaticos.service';
import { TiposIdentificacionService } from '../../services/tipos-identificacion.service';
import { TiposAcudienteService } from '../../services/tipos-acudiente.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../common/header/header.component';
import { BuscarComponent } from '../../common/buscar/buscar.component';
import { GruposService } from '../../services/grupos.service';
import { UtilService } from '../../common/constantes/util.service';
import { SearchPipeGeneral } from '../../common/pipes/search';

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.scss',
  standalone: true,
  providers: [SearchPipeGeneral],
  imports: [CommonModule, FormsModule, HeaderComponent, BuscarComponent]
})
export class AsistenciaComponent implements OnInit {

  titulo = "Módulo de registro de asistencia";

  public titulos = [] as any[];
  public datos = [] as any[];

  public listas = {
    noIngresos: [] as any[],
    noSalidas: [] as any[],
    grupos: [] as any[],
  };

  public model = {
    estudiante: {} as any,
    opcion: "actual"
  };
  private estudiantesCompletos: any[] = [];
  public buscarTexto: string = '';
  private salidasCompletas: any[] = [];

  // Propiedades para el panel de cobros automáticos
  public mostrarPanelCobros = false;
  public estudianteSeleccionadoCobro: any = null;
  public cobrosDetectados: any[] = [];
  public horaSalidaEditable: string = '';
  public horaIngresoEditable: string = '';
  public observacionActual: string = '';
  public evaluandoReglas = false;
  public tipoEventoActual: string = '';

  // === REGISTRO RÁPIDO ===
  public mostrarRegistroRapido = false;
  public registroRapidoEnProceso = false;
  public ninoCamposHabilitados = false;
  public acudCamposHabilitados = false;
  public listasRegistroRapido = {
    tiposIdentificacion: [] as any[],
    grupos: [] as any[],
    tiposAcudiente: [] as any[],
  };
  public modelRegistroRapido = {
    nino_id_tipo_identificacion: '' as any,
    nino_numero_identificacion: '',
    nino_primer_nombre: '',
    nino_segundo_nombre: '',
    nino_primer_apellido: '',
    nino_segundo_apellido: '',
    id_grupo: '' as any,
    acud_id_tipo_identificacion: '' as any,
    acud_numero_identificacion: '',
    acud_primer_nombre: '',
    acud_segundo_nombre: '',
    acud_primer_apellido: '',
    acud_segundo_apellido: '',
    acud_telefono: '',
    id_tipo_acudiente: '' as any,
  };

  constructor(
    private asistenciaEstudiantesService: AsistenciaEstudiantesService,
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private observacionesEstudiantesService: ObservacionesEstudiantesService,
    private acudientesService: AcudientesService,
    private personasService: PersonasService,
    private autorizadosRecogerService: AutorizadosRecogerService,
    private motorCobrosService: MotorCobrosAutomaticosService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private tiposAcudienteService: TiposAcudienteService,
    private utilService: UtilService,
    private searchPipeGeneral: SearchPipeGeneral
  ) { }

  ngOnInit(): void {
    this.consultaGrupos();
    this.consultaNoIngresos();
    this.consultaNoSalidas();
  }

  consultaGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.listas.grupos = body;
    });
  }

  consultaNoIngresos() {
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio docentes", body);
      this.estudiantesCompletos = [...body];
      this.listas.noIngresos = body;
      this.actualizarContadoresGrupos();
    });
  }

  consultaNoSalidas() {
    this.asistenciaEstudiantesService.obtenerNoSalidas().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio docentes", body);
      this.salidasCompletas = [...body];
      this.listas.noSalidas = body;
      this.actualizarContadoresGrupos();
    });
  }

  private actualizarContadoresGrupos() {
    this.listas.grupos.forEach((grupo: any) => {
      grupo.asistentes = this.listas.noSalidas.filter(f => f.nombre_grupo == grupo.nombre).length;
      const sinIngresar = this.listas.noIngresos.filter(f => f.nombre_grupo == grupo.nombre).length;
      grupo.totalGrupo = grupo.asistentes + sinIngresar;
    });
  }

  buscar(event: any) {
    console.log("buscar", event);
    this.buscarTexto = event;

    if (this.model.opcion === 'ingresos') {
      this.listas.noIngresos = this.searchPipeGeneral.transform(
        this.estudiantesCompletos,
        this.buscarTexto
      );
    } else if (this.model.opcion === 'salidas') {
      this.listas.noSalidas = this.searchPipeGeneral.transform(
        this.salidasCompletas,
        this.buscarTexto
      );
      this.listas.grupos.forEach((grupo: any) => {
        grupo.asistentes = this.listas.noSalidas.filter(f => f.nombre_grupo == grupo.nombre).length;
      });
    }
  }

  seleccionarOpcion(opcion: any) {
    this.model.opcion = opcion;
    this.cerrarPanelCobros();
    this.cerrarRegistroRapido();
    switch (opcion) {
      case "ingresos":
        this.consultaNoIngresos();
        break;
      case "salidas":
        this.consultaNoSalidas();
        break;
      default:
        console.log("OPCION: ", opcion, this.model.opcion);
        this.consultaNoSalidas();
        break;
    }
  }

  crearObservacion(estudiante: any, tipo: string, descripcion: string) {
    if (!descripcion || descripcion.trim() === '') return;

    const tipoObservacionId = tipo === 'ingreso' ? '5' : '6';
    const id_usuario = this.utilService.obtenerIdUsuarioActual();

    const observacion = {
      id: 0,
      id_estudiante: estudiante.id_estudiante || estudiante.id,
      id_tipo_observacion_estudiante: tipoObservacionId,
      descripcion: `Observacion de ${tipo}: ${descripcion}`,
      fecha: this.obtenerFechaActual(),
      id_estudiante_afectado: null,
      fecha_informe_padre: null,
      firma_informe_padre: null,
      fecha_informe_padre_afectado: null,
      firma_informe_padre_afectado: null,
      id_usuario: id_usuario,
      fecha_registro: new Date().toISOString()
    };

    this.observacionesEstudiantesService.crear(observacion).subscribe({
      next: (response: any) => {
        console.log('Observacion creada automaticamente', response);
      },
      error: (error) => {
        console.error('Error al crear observacion automatica:', error);
      }
    });
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /**
   * Devuelve la fecha actual en formato YYYY-MM-DD usando hora local (no UTC).
   * No usar new Date().toISOString().split('T')[0] porque convierte a UTC y desfasa el día.
   */
  private obtenerFechaActual(): string {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  private obtenerHoraActualCompleta(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
  }

  seleccionarEstudiante(estudiante: any) {
    if (this.model.opcion === 'ingresos') {
      this.iniciarIngreso(estudiante);
    } else if (this.model.opcion === 'salidas') {
      this.iniciarSalida(estudiante);
    }
  }

  private iniciarIngreso(estudiante: any) {
    this.tipoEventoActual = 'ingreso';
    this.estudianteSeleccionadoCobro = estudiante;
    this.horaIngresoEditable = this.obtenerHoraActual();
    this.observacionActual = '';
    this.cobrosDetectados = [];
    this.mostrarPanelCobros = true;
    this.evaluarReglasIngreso(estudiante);
  }

  private iniciarSalida(estudiante: any) {
    this.tipoEventoActual = 'salida';
    this.estudianteSeleccionadoCobro = estudiante;
    this.horaSalidaEditable = this.obtenerHoraActual();
    this.observacionActual = '';
    this.cobrosDetectados = [];
    this.mostrarPanelCobros = true;
    this.evaluarReglasSalida(estudiante);
  }

  evaluarReglasIngreso(estudiante: any) {
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    this.evaluandoReglas = true;

    const data = {
      id_estudiante: idEstudiante,
      tipo_evento: 'ingreso',
      hora: this.horaIngresoEditable + ':00',
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.evaluar(data).subscribe({
      next: (respuesta: any) => {
        this.cobrosDetectados = (respuesta.cobros || []).map((c: any) => ({
          ...c,
          seleccionado: true
        }));
        this.evaluandoReglas = false;
      },
      error: (error) => {
        console.error('Error al evaluar reglas de ingreso:', error);
        this.cobrosDetectados = [];
        this.evaluandoReglas = false;
      }
    });
  }

  evaluarReglasSalida(estudiante: any) {
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    this.evaluandoReglas = true;

    const data = {
      id_estudiante: idEstudiante,
      tipo_evento: 'salida',
      hora: this.horaSalidaEditable + ':00',
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.evaluar(data).subscribe({
      next: (respuesta: any) => {
        this.cobrosDetectados = (respuesta.cobros || []).map((c: any) => ({
          ...c,
          seleccionado: true
        }));
        this.evaluandoReglas = false;
      },
      error: (error) => {
        console.error('Error al evaluar reglas de salida:', error);
        this.cobrosDetectados = [];
        this.evaluandoReglas = false;
      }
    });
  }

  onHoraChange() {
    if (!this.estudianteSeleccionadoCobro) return;

    if (this.tipoEventoActual === 'salida') {
      this.evaluarReglasSalida(this.estudianteSeleccionadoCobro);
    } else if (this.tipoEventoActual === 'ingreso') {
      this.evaluarReglasIngreso(this.estudianteSeleccionadoCobro);
    }
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '$0';
    return '$' + valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  get totalCobrosSeleccionados(): number {
    return this.cobrosDetectados
      .filter(c => c.seleccionado)
      .reduce((sum, c) => sum + Number(c.valor), 0);
  }

  confirmarRegistro() {
    const estudiante = this.estudianteSeleccionadoCobro;
    if (!estudiante) return;

    if (this.tipoEventoActual === 'ingreso') {
      this.confirmarIngreso(estudiante);
    } else if (this.tipoEventoActual === 'salida') {
      this.confirmarSalida(estudiante);
    }
  }

  private confirmarIngreso(estudiante: any) {
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      const noIngresado = body.some(obj => Number(obj.id) === Number(estudiante.id));
      if (noIngresado) {
        this.asistenciaEstudiantesService.registroIngreso(estudiante.id, this.observacionActual).subscribe((response: any) => {
          if (response) {
            const idAsistencia = response.body?.id || response.id;
            this.crearObservacion(estudiante, "ingreso", this.observacionActual);
            this.ejecutarCobrosAutomaticos(estudiante, idAsistencia);
            this.consultaNoIngresos();
            this.consultaNoSalidas();
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Registro de Ingreso Existente',
          text: `El registro de ingreso de ${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''} ${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}, se realizo previamente.`,
          confirmButtonText: 'Entendido'
        });
        this.consultaNoIngresos();
        this.cerrarPanelCobros();
      }
    });
  }

  private confirmarSalida(estudiante: any) {
    this.asistenciaEstudiantesService.obtenerNoSalidas().subscribe((response: any) => {
      const body = response.body as any[];
      const noSalida = body.some(obj => Number(obj.id_estudiante) === Number(estudiante.id_estudiante));
      if (noSalida) {
        this.asistenciaEstudiantesService.registroSalida(estudiante.id, this.observacionActual).subscribe((response: any) => {
          if (response) {
            const idAsistencia = estudiante.id;
            this.crearObservacion(estudiante, "salida", this.observacionActual);
            this.ejecutarCobrosAutomaticos(estudiante, idAsistencia);
            this.consultaNoSalidas();
            this.consultaNoIngresos();
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Registro de Salida',
          text: `El registro de salida de ${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''} ${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}, se realizo previamente.`,
          confirmButtonText: 'Entendido'
        });
        this.consultaNoSalidas();
        this.cerrarPanelCobros();
      }
    });
  }

  private ejecutarCobrosAutomaticos(estudiante: any, idAsistencia: any) {
    const cobrosSeleccionados = this.cobrosDetectados.filter(c => c.seleccionado);

    if (cobrosSeleccionados.length === 0) {
      this.mostrarExito();
      return;
    }

    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    const data = {
      cobros: cobrosSeleccionados.map(c => ({
        id_regla: c.id_regla,
        id_producto_servicio: c.id_producto_servicio,
        id_asistencia: idAsistencia,
        valor: c.valor
      })),
      id_estudiante: idEstudiante,
      id_usuario: idUsuario,
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.ejecutar(data).subscribe({
      next: (respuesta: any) => {
        if (respuesta.success) {
          Swal.fire({
            icon: 'success',
            title: 'Registro exitoso',
            html: `Asistencia registrada.<br><strong>${respuesta.cobros_generados} cobro(s) automático(s) generado(s)</strong>`,
            timer: 3000,
            showConfirmButton: true,
            confirmButtonText: 'Entendido'
          });
        } else {
          this.mostrarExito();
        }
        this.cerrarPanelCobros();
      },
      error: (error) => {
        console.error('Error al ejecutar cobros automáticos:', error);
        Swal.fire({
          icon: 'warning',
          title: 'Asistencia registrada',
          text: 'La asistencia se registró pero hubo un error al generar los cobros automáticos.',
          confirmButtonText: 'Entendido'
        });
        this.cerrarPanelCobros();
      }
    });
  }

  private mostrarExito() {
    Swal.fire({
      icon: 'success',
      title: 'Registro exitoso',
      text: 'Asistencia registrada correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
    this.cerrarPanelCobros();
  }

  cerrarPanelCobros() {
    this.mostrarPanelCobros = false;
    this.estudianteSeleccionadoCobro = null;
    this.cobrosDetectados = [];
    this.tipoEventoActual = '';
    this.observacionActual = '';
  }

  mostrarDetalleEstudiante(estudiante: any) {
    const estudianteId = estudiante.id_estudiante || estudiante.id;

    this.acudientesService.obtenerPorEstudiante(estudianteId).subscribe({
      next: (responseAcudientes: any) => {
        const acudientes = responseAcudientes.body as any[];

        this.autorizadosRecogerService.obtenerActivosHoyPorEstudiante(estudianteId).subscribe({
          next: (responseAutorizados: any) => {
            const autorizados = responseAutorizados.body as any[];
            this.renderModalDetalle(estudiante, acudientes, autorizados);
          },
          error: () => {
            this.renderModalDetalle(estudiante, acudientes, []);
          }
        });
      },
      error: (error) => {
        console.error('Error al obtener acudientes:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los acudientes autorizados',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  private renderModalDetalle(estudiante: any, acudientes: any[], autorizados: any[]) {
    let htmlContent = '';

    if (acudientes.length > 0) {
      htmlContent += `<div style="font-size:13px;font-weight:700;color:#8B6914;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #FFC107;">Acudientes</div>`;

      acudientes.forEach(acudiente => {
        const fotoUrl = acudiente.foto
          ? this.personasService.obtenerUrlFoto(acudiente.foto) + '?t=' + new Date().getTime()
          : '/assets/images/foto.png';

        const autorizado = acudiente.autorizado_recoger === '1' || acudiente.autorizado_recoger === 1;

        htmlContent += this.buildPersonaCard(
          fotoUrl,
          acudiente.nombre_persona,
          acudiente.documento_acudiente,
          acudiente.nombre_tipo_acudiente,
          autorizado,
          autorizado ? 'Autorizado para recoger' : 'No autorizado para recoger'
        );
      });
    }

    if (autorizados.length > 0) {
      htmlContent += `<div style="font-size:13px;font-weight:700;color:#1565c0;text-transform:uppercase;letter-spacing:0.5px;margin:16px 0 10px 0;padding-bottom:6px;border-bottom:2px solid #42a5f5;">Autorizados para recoger</div>`;

      autorizados.forEach(aut => {
        const fotoUrl = aut.foto
          ? this.personasService.obtenerUrlFoto(aut.foto) + '?t=' + new Date().getTime()
          : '/assets/images/foto.png';

        htmlContent += this.buildPersonaCard(
          fotoUrl,
          aut.nombre_persona,
          aut.documento_persona,
          aut.nombre_tipo_autorizacion,
          true,
          `${aut.nombre_tipo_autorizacion} - Autorizado por: ${aut.nombre_persona_autoriza}`
        );
      });
    }

    if (acudientes.length === 0 && autorizados.length === 0) {
      htmlContent = `
        <div style="text-align:center; padding:24px; color:#9e9e9e;">
          <i class="fas fa-user-slash" style="font-size:2.5rem; margin-bottom:12px; display:block;"></i>
          No hay personas autorizadas para este estudiante
        </div>`;
    }

    Swal.fire({
      title: 'Personas autorizadas',
      html: `<div style="max-height:420px;overflow-y:auto;padding:4px;">${htmlContent}</div>`,
      width: '520px',
      background: 'linear-gradient(to bottom, #ffffff 80%, ' + estudiante.color + ')',
      showCancelButton: true,
      focusConfirm: true,
      confirmButtonText: "regresar",
      cancelButtonText: "cancelar",
      didOpen: () => {
        const fotos = document.querySelectorAll('.foto-acudiente-thumb');
        fotos.forEach((img: any) => {
          img.addEventListener('click', () => {
            const url = img.getAttribute('data-foto-url');
            const nombre = img.getAttribute('data-nombre');
            Swal.fire({
              title: nombre,
              imageUrl: url,
              imageAlt: nombre,
              showConfirmButton: true,
              confirmButtonText: 'Cerrar',
              width: 'auto',
              customClass: {
                image: 'swal-foto-ampliada'
              },
              didOpen: () => {
                const imgEl = document.querySelector('.swal-foto-ampliada') as HTMLElement;
                if (imgEl) {
                  imgEl.style.maxWidth = '400px';
                  imgEl.style.maxHeight = '400px';
                  imgEl.style.borderRadius = '12px';
                  imgEl.style.objectFit = 'cover';
                  imgEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }
              }
            });
          });
        });
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.seleccionarEstudiante(estudiante);
      }
    });
  }

  private buildPersonaCard(fotoUrl: string, nombre: string, documento: string, tipo: string, autorizado: boolean, badgeText: string): string {
    return `
      <div style="
        display:flex;
        align-items:center;
        gap:16px;
        padding:14px 16px;
        margin-bottom:10px;
        background:#fff;
        border-radius:10px;
        box-shadow:0 2px 8px rgba(0,0,0,0.08);
        border-left:4px solid ${autorizado ? '#4caf50' : '#ef5350'};
        transition:transform 0.2s;
      ">
        <img 
          src="${fotoUrl}" 
          alt="${nombre}"
          class="foto-acudiente-thumb"
          data-foto-url="${fotoUrl}"
          data-nombre="${nombre}"
          style="
            width:64px;
            height:64px;
            border-radius:50%;
            object-fit:cover;
            border:3px solid ${autorizado ? '#4caf50' : '#ef5350'};
            flex-shrink:0;
            cursor:pointer;
            transition:transform 0.2s, box-shadow 0.2s;
          "
          onmouseover="this.style.transform='scale(1.1)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.25)'"
          onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'"
          onerror="this.src='/assets/images/foto.png'"
        />
        <div style="flex:1; min-width:0;">
          <div style="
            font-weight:600;
            font-size:1rem;
            color:#212121;
            margin-bottom:4px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            ${nombre}
          </div>
          <div style="
            font-size:0.85rem;
            color:#616161;
            margin-bottom:3px;
          ">
            <i class="fas fa-id-card" style="color:#7986cb; margin-right:6px;"></i>
            CC: ${documento || 'Sin documento'}
          </div>
          <div style="
            font-size:0.85rem;
            color:#616161;
            margin-bottom:3px;
          ">
            <i class="fas fa-users" style="color:#7986cb; margin-right:6px;"></i>
            ${tipo}
          </div>
          <div style="
            display:inline-block;
            font-size:0.75rem;
            font-weight:600;
            padding:3px 10px;
            border-radius:12px;
            margin-top:2px;
            background:${autorizado ? '#e8f5e9' : '#ffebee'};
            color:${autorizado ? '#2e7d32' : '#c62828'};
          ">
            ${autorizado ? '&#10003;' : '&#10007;'} ${badgeText}
          </div>
        </div>
      </div>
    `;
  }

  recibirMensaje(event: any) {
    console.log("Mensaje: ", event);
  }

  verActual(grupo: any) {
    const lista = `<ul class="lista-no-seleccionable">` + this.listas.noSalidas.filter(ns => ns.nombre_grupo == grupo.nombre).map(li => {
      return `<li class="item-lista">${li.primer_nombre} ${li.primer_apellido}${li.observacion_ingreso == '' ? '' : '<br/><sub>' + li.observacion_ingreso + '</sub>'} </li>`;
    }).toString().replaceAll(",", "") + `</ul>`;
    console.log("lista", this.listas.noSalidas);
    Swal.fire({
      title: 'Estudiantes actuales',
      html: lista,
      background: 'linear-gradient(to bottom, #ffffff 80%, ' + grupo.color + ')',
      showCancelButton: false,
      focusConfirm: true,
      confirmButtonText: "cerrar"
    })
  }

  // ============================================================
  // REGISTRO RÁPIDO
  // ============================================================

  abrirRegistroRapido() {
    this.cerrarPanelCobros();
    this.mostrarRegistroRapido = true;
    this.limpiarRegistroRapido();
    this.cargarListasRegistroRapido();
  }

  cerrarRegistroRapido() {
    this.mostrarRegistroRapido = false;
    this.registroRapidoEnProceso = false;
    this.ninoCamposHabilitados = false;
    this.acudCamposHabilitados = false;
  }

  limpiarRegistroRapido() {
    this.ninoCamposHabilitados = false;
    this.acudCamposHabilitados = false;
    this.modelRegistroRapido = {
      nino_id_tipo_identificacion: 2,
      nino_numero_identificacion: '',
      nino_primer_nombre: '',
      nino_segundo_nombre: '',
      nino_primer_apellido: '',
      nino_segundo_apellido: '',
      id_grupo: this.obtenerGrupoDefaultId(),
      acud_id_tipo_identificacion: 1,
      acud_numero_identificacion: '',
      acud_primer_nombre: '',
      acud_segundo_nombre: '',
      acud_primer_apellido: '',
      acud_segundo_apellido: '',
      acud_telefono: '',
      id_tipo_acudiente: '',
    };
  }

  private obtenerGrupoDefaultId(): any {
    const grupos = this.listasRegistroRapido.grupos.length > 0
      ? this.listasRegistroRapido.grupos
      : this.listas.grupos;

    if (grupos && grupos.length > 0) {
      const grupoDefault = grupos.find((g: any) => Number(g.calificable) === 0);
      if (grupoDefault) return grupoDefault.id;
    }
    return '';
  }

  seleccionarTipoAcudiente(tipo: any) {
    this.modelRegistroRapido.id_tipo_acudiente = tipo.id;
  }

  private cargarListasRegistroRapido() {
    if (this.listasRegistroRapido.tiposIdentificacion.length === 0) {
      this.tiposIdentificacionService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.tiposIdentificacion = response.body;
      });
    }
    if (this.listasRegistroRapido.grupos.length === 0) {
      this.gruposService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.grupos = response.body;
        if (!this.modelRegistroRapido.id_grupo) {
          this.modelRegistroRapido.id_grupo = this.obtenerGrupoDefaultId();
        }
      });
    }
    if (this.listasRegistroRapido.tiposAcudiente.length === 0) {
      this.tiposAcudienteService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.tiposAcudiente = response.body;
      });
    }
  }

  formularioRegistroRapidoValido(): boolean {
    const m = this.modelRegistroRapido;
    return Boolean(
      this.ninoCamposHabilitados &&
      this.acudCamposHabilitados &&
      m.nino_id_tipo_identificacion &&
      m.nino_numero_identificacion &&
      m.nino_primer_nombre &&
      m.nino_primer_apellido &&
      m.id_grupo &&
      m.acud_id_tipo_identificacion &&
      m.acud_numero_identificacion &&
      m.acud_primer_nombre &&
      m.acud_primer_apellido &&
      m.id_tipo_acudiente
    );
  }

  ejecutarRegistroRapido() {
    if (!this.formularioRegistroRapidoValido()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Verifique ambos documentos y complete todos los campos obligatorios marcados con *',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.registroRapidoEnProceso = true;
    const id_usuario = this.utilService.obtenerIdUsuarioActual();

    const data = {
      ...this.modelRegistroRapido,
      id_usuario: id_usuario
    };

    this.estudiantesService.registroRapido(data).subscribe({
      next: (respuesta: any) => {
        this.registroRapidoEnProceso = false;

        if (respuesta.error) {
          Swal.fire({ icon: 'error', title: 'Error', text: respuesta.error, confirmButtonText: 'Entendido' });
          return;
        }

        const idEstudianteCreado = respuesta.id_estudiante;
        const nombreEstudiante = respuesta.nombre_estudiante;
        const yaExistia = respuesta.estudiante_ya_existia;

        let mensaje = `<strong>${nombreEstudiante}</strong> registrado correctamente.`;
        if (yaExistia) {
          mensaje += '<br><small>El estudiante ya existía en el sistema.</small>';
        }
        mensaje += '<br><br>Ahora puede registrar su ingreso.';

        Swal.fire({
          icon: 'success',
          title: 'Estudiante creado',
          html: mensaje,
          confirmButtonText: 'Registrar ingreso',
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
          this.abrirIngresoPostRegistro(idEstudianteCreado);
        });

        this.cerrarRegistroRapido();
      },
      error: (error: any) => {
        this.registroRapidoEnProceso = false;
        console.error('Error en registro rápido:', error);
        const mensajeError = error?.error?.error || 'Ocurrió un error al realizar el registro rápido';
        Swal.fire({ icon: 'error', title: 'Error', text: mensajeError, confirmButtonText: 'Entendido' });
      }
    });
  }

  /**
   * Después del registro rápido, fuerza la pestaña de ingresos,
   * refresca la lista y abre el panel de cobros con el estudiante recién creado.
   */
  private abrirIngresoPostRegistro(idEstudiante: number) {
    this.model.opcion = 'ingresos';
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiantesCompletos = [...body];
      this.listas.noIngresos = body;

      const estudianteEncontrado = body.find(
        (e: any) => Number(e.id) === Number(idEstudiante)
      );

      if (estudianteEncontrado) {
        this.seleccionarEstudiante(estudianteEncontrado);
      }
    });
    this.consultaNoSalidas();
  }

  buscarPersonaNino() {
    const m = this.modelRegistroRapido;
    if (!m.nino_id_tipo_identificacion || !m.nino_numero_identificacion) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Seleccione tipo e ingrese número de documento del niño.', confirmButtonText: 'Entendido' });
      return;
    }

    this.personasService.obtenerByIdentificacion(m.nino_id_tipo_identificacion, m.nino_numero_identificacion).subscribe({
      next: (response: any) => {
        const personas = response.body || response;
        if (personas && personas.length > 0) {
          const p = personas[0];
          this.modelRegistroRapido.nino_primer_nombre = p.primer_nombre || '';
          this.modelRegistroRapido.nino_segundo_nombre = p.segundo_nombre || '';
          this.modelRegistroRapido.nino_primer_apellido = p.primer_apellido || '';
          this.modelRegistroRapido.nino_segundo_apellido = p.segundo_apellido || '';
          Swal.fire({ icon: 'info', title: 'Persona encontrada', text: 'Se cargaron los datos. Puede modificarlos si es necesario.', timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'info', title: 'Persona nueva', text: 'No se encontró en el sistema. Ingrese los datos.', timer: 2000, showConfirmButton: false });
        }
        this.ninoCamposHabilitados = true;
      },
      error: () => {
        this.ninoCamposHabilitados = true;
      }
    });
  }

  buscarPersonaAcudiente() {
    const m = this.modelRegistroRapido;
    if (!m.acud_id_tipo_identificacion || !m.acud_numero_identificacion) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Seleccione tipo e ingrese número de documento del acudiente.', confirmButtonText: 'Entendido' });
      return;
    }

    this.personasService.obtenerByIdentificacion(m.acud_id_tipo_identificacion, m.acud_numero_identificacion).subscribe({
      next: (response: any) => {
        const personas = response.body || response;
        if (personas && personas.length > 0) {
          const p = personas[0];
          this.modelRegistroRapido.acud_primer_nombre = p.primer_nombre || '';
          this.modelRegistroRapido.acud_segundo_nombre = p.segundo_nombre || '';
          this.modelRegistroRapido.acud_primer_apellido = p.primer_apellido || '';
          this.modelRegistroRapido.acud_segundo_apellido = p.segundo_apellido || '';
          this.modelRegistroRapido.acud_telefono = p.telefono || '';
          Swal.fire({ icon: 'info', title: 'Persona encontrada', text: 'Se cargaron los datos. Puede modificarlos si es necesario.', timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'info', title: 'Persona nueva', text: 'No se encontró en el sistema. Ingrese los datos.', timer: 2000, showConfirmButton: false });
        }
        this.acudCamposHabilitados = true;
      },
      error: () => {
        this.acudCamposHabilitados = true;
      }
    });
  }

}