import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { AsistenciaEdicionService } from '../../../../services/asistencia-edicion.service';
import { MotorCobrosAutomaticosService } from '../../../../services/motor-cobros-automaticos.service';
import { UtilService } from '../../../../common/constantes/util.service';
import Swal from 'sweetalert2';

/**
 * Corrección de un movimiento de asistencia.
 *
 * Funciona como la pantalla de asistencia normal: apenas cambia una hora se
 * evalúan los cobros, se ven antes de grabar y se pueden desmarcar uno por
 * uno. Nada se genera sin que la usuaria lo haya visto.
 *
 * Secuencia al grabar, cuando cambiaron las horas:
 *   1. PUT: guarda horas, observaciones y útiles, y anula los cobros viejos.
 *   2. Motor de cobros: ejecuta solo los que quedaron marcados, sin notificar.
 *   3. Notificar: recién ahí se le avisa al acudiente, para que el mensaje
 *      salga con los cobros definitivos.
 * Si las horas no cambiaron, los cobros quedan como estaban y solo se notifica.
 */
@Component({
  selector: 'app-detalle-asistencia',
  templateUrl: './detalle-asistencia.component.html',
  styleUrl: './detalle-asistencia.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class DetalleAsistenciaComponent implements OnInit {

  titulo = "Corregir Asistencia";

  public id: any = null;

  public movimiento: any = null;
  public utiles = [] as any[];
  public cobros = [] as any[];
  public bloqueado: boolean = false;

  // Cobros evaluados con las horas nuevas, uno por evento.
  public cobrosIngreso = [] as any[];
  public cobrosSalida = [] as any[];
  public evaluandoIngreso: boolean = false;
  public evaluandoSalida: boolean = false;

  // Horas como estaban al abrir, para saber si de verdad cambiaron.
  private horaIngresoOriginal: string = '';
  private horaSalidaOriginal: string = '';

  public cargando: boolean = false;
  public guardando: boolean = false;

  constructor(
    private asistenciaEdicionService: AsistenciaEdicionService,
    private motorCobrosService: MotorCobrosAutomaticosService,
    private utilService: UtilService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.consultar();
  }

  consultar() {
    if (!this.id) {
      return;
    }

    this.cargando = true;

    this.asistenciaEdicionService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const cuerpo = response.body;

        this.movimiento = cuerpo.movimiento;
        this.cobros = (cuerpo.cobros as any[]) || [];
        this.bloqueado = cuerpo.bloqueado === 1 || cuerpo.bloqueado === true;

        // estadoTrajo y estadoRegreso manejan los tres estados igual que la
        // pantalla de asistencia: 1 sí, 0 no, null sin verificar.
        this.utiles = ((cuerpo.utiles as any[]) || []).map((util: any) => ({
          ...util,
          estadoTrajo: util.trajo === null || util.trajo === undefined ? null : (util.trajo == 1 ? 1 : 0),
          estadoRegreso: util.regreso === null || util.regreso === undefined ? null : (util.regreso == 1 ? 1 : 0)
        }));

        this.horaIngresoOriginal = this.movimiento.hora_ingreso || '';
        this.horaSalidaOriginal = this.movimiento.hora_salida || '';

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Atención', 'No se pudo consultar el registro.', 'error').then(() => {
          this.router.navigate(['operaciones/editar-asistencia']);
        });
      }
    });
  }

  get cambioIngreso(): boolean {
    return !!this.movimiento && (this.movimiento.hora_ingreso || '') !== this.horaIngresoOriginal;
  }

  get cambioSalida(): boolean {
    return !!this.movimiento && (this.movimiento.hora_salida || '') !== this.horaSalidaOriginal;
  }

  get cambiaronHoras(): boolean {
    return this.cambioIngreso || this.cambioSalida;
  }

  // ============================================================
  // COBROS
  // ============================================================

  /**
   * Igual que en la asistencia normal: apenas cambia la hora se evalúa.
   * Si la hora vuelve a ser la original, los cobros propuestos se descartan,
   * porque ese evento ya no se va a tocar.
   */
  onHoraIngresoChange() {
    if (!this.cambioIngreso) {
      this.cobrosIngreso = [];
      return;
    }
    this.evaluar('ingreso', this.movimiento.hora_ingreso);
  }

  onHoraSalidaChange() {
    if (!this.cambioSalida || !this.movimiento.hora_salida) {
      this.cobrosSalida = [];
      return;
    }
    this.evaluar('salida', this.movimiento.hora_salida);
  }

  private evaluar(tipoEvento: string, hora: string) {
    if (!hora) {
      return;
    }

    if (tipoEvento === 'salida') {
      this.evaluandoSalida = true;
    } else {
      this.evaluandoIngreso = true;
    }

    this.motorCobrosService.evaluar({
      id_estudiante: this.movimiento.id_estudiante,
      tipo_evento: tipoEvento,
      hora: hora + ':00',
      fecha: this.movimiento.fecha
    }).subscribe({
      next: (respuesta: any) => {
        // Llegan marcados; la usuaria desmarca los que no quiere.
        const cobros = ((respuesta.cobros as any[]) || []).map((cobro: any) => ({
          ...cobro,
          seleccionado: true
        }));

        if (tipoEvento === 'salida') {
          this.cobrosSalida = cobros;
          this.evaluandoSalida = false;
        } else {
          this.cobrosIngreso = cobros;
          this.evaluandoIngreso = false;
        }
      },
      error: () => {
        if (tipoEvento === 'salida') {
          this.cobrosSalida = [];
          this.evaluandoSalida = false;
        } else {
          this.cobrosIngreso = [];
          this.evaluandoIngreso = false;
        }
      }
    });
  }

  get cobrosPropuestos(): any[] {
    return [...this.cobrosIngreso, ...this.cobrosSalida];
  }

  get totalCobrosSeleccionados(): number {
    return this.cobrosPropuestos
      .filter((cobro: any) => cobro.seleccionado)
      .reduce((suma: number, cobro: any) => suma + Number(cobro.valor || 0), 0);
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '$0';
    return '$' + valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ============================================================
  // ÚTILES
  // ============================================================

  // Cicla: sin verificar -> sí -> no -> sin verificar.
  alternarTrajo(util: any) {
    util.estadoTrajo = util.estadoTrajo === null || util.estadoTrajo === undefined
      ? 1
      : (util.estadoTrajo === 1 ? 0 : null);
  }

  alternarRegreso(util: any) {
    util.estadoRegreso = util.estadoRegreso === null || util.estadoRegreso === undefined
      ? 1
      : (util.estadoRegreso === 1 ? 0 : null);
  }

  get todosTrajo(): boolean {
    return this.utiles.length > 0 && this.utiles.every((util: any) => util.estadoTrajo === 1);
  }

  alternarTodosTrajo() {
    const valor = this.todosTrajo ? null : 1;
    this.utiles.forEach((util: any) => util.estadoTrajo = valor);
  }

  get todosRegreso(): boolean {
    return this.utiles.length > 0 && this.utiles.every((util: any) => util.estadoRegreso === 1);
  }

  alternarTodosRegreso() {
    const valor = this.todosRegreso ? null : 1;
    this.utiles.forEach((util: any) => util.estadoRegreso = valor);
  }

  /**
   * Agrega un útil suelto a este niño, igual que en la pantalla de asistencia.
   * Se crea en la base al grabar, no antes.
   */
  async agregarUtil() {
    const { value: texto } = await Swal.fire({
      title: 'Agregar útil',
      input: 'text',
      inputPlaceholder: 'Ej: Inhalador',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!texto || texto.trim() === '') {
      return;
    }

    this.utiles.push({
      id: null,
      id_util_diario: null,
      nombre_libre: texto.trim(),
      nombre: texto.trim(),
      icono: null,
      observacion: null,
      estadoTrajo: 1,
      estadoRegreso: null
    });
  }

  async editarNota(util: any) {
    const { value: texto } = await Swal.fire({
      title: 'Nota del útil',
      input: 'text',
      inputValue: util.observacion || '',
      inputPlaceholder: 'Ej: llegó sin tapa',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar'
    });

    if (texto === undefined) {
      return;
    }

    util.observacion = texto.trim() === '' ? null : texto.trim();
  }

  // ============================================================
  // GRABAR
  // ============================================================

  regresar() {
    this.router.navigate(['operaciones/editar-asistencia']);
  }

  grabar() {
    if (this.bloqueado) {
      Swal.fire('No permitido', 'Este registro tiene cobros con pagos aplicados.', 'warning');
      return;
    }

    if (!this.movimiento.hora_ingreso) {
      Swal.fire('Atención', 'La hora de ingreso es obligatoria.', 'warning');
      return;
    }

    if (this.movimiento.hora_salida && this.movimiento.hora_salida < this.movimiento.hora_ingreso) {
      Swal.fire('Atención', 'La hora de salida no puede ser anterior a la de ingreso.', 'warning');
      return;
    }

    const marcados = this.cobrosPropuestos.filter((cobro: any) => cobro.seleccionado);

    let aviso = '';
    if (this.cambiaronHoras && this.cobros.length > 0) {
      aviso += `<br><br>Se anulan las ${this.cobros.length} cuenta(s) por cobrar que tenía este registro.`;
    }
    if (marcados.length > 0) {
      aviso += `<br>Se generan ${marcados.length} cobro(s) nuevos por ${this.formatearMoneda(this.totalCobrosSeleccionados)}.`;
    }

    Swal.fire({
      title: '¿Guardar la corrección?',
      html: `Al acudiente se le va a avisar del cambio.${aviso}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }
      this.enviar();
    });
  }

  private enviar() {
    this.guardando = true;

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    const dato = {
      id: this.id,
      id_usuario: idUsuario,
      hora_ingreso: this.movimiento.hora_ingreso,
      hora_salida: this.movimiento.hora_salida || null,
      observacion_ingreso: this.movimiento.observacion_ingreso,
      observacion_salida: this.movimiento.observacion_salida,
      utiles: this.utiles.map((util: any) => ({
        id: util.id,
        id_util_diario: util.id_util_diario || null,
        nombre_libre: util.nombre_libre || null,
        trajo: util.estadoTrajo === null || util.estadoTrajo === undefined ? null : util.estadoTrajo,
        regreso: util.estadoRegreso === null || util.estadoRegreso === undefined ? null : util.estadoRegreso,
        observacion: util.observacion || null
      }))
    };

    this.asistenciaEdicionService.actualizar(dato).subscribe({
      next: (respuesta: any) => {
        const recalcular = respuesta.recalcular_cobros === 1 || respuesta.recalcular_cobros === true;
        const marcados = this.cobrosPropuestos.filter((cobro: any) => cobro.seleccionado);

        if (recalcular && marcados.length > 0) {
          this.ejecutarCobros(idUsuario);
          return;
        }

        this.notificar(idUsuario, 0);
      },
      error: (error: any) => {
        this.guardando = false;
        const mensaje = error?.error?.error || 'No se pudo guardar la corrección.';
        Swal.fire('Atención', mensaje, 'error');
      }
    });
  }

  /**
   * Ejecuta solo los cobros que la usuaria dejó marcados. Ingreso y salida van
   * por separado porque el motor los registra con su propio tipo de evento.
   */
  private ejecutarCobros(idUsuario: any) {
    const lotes = [
      { tipo: 'ingreso', cobros: this.cobrosIngreso.filter((c: any) => c.seleccionado) },
      { tipo: 'salida', cobros: this.cobrosSalida.filter((c: any) => c.seleccionado) }
    ].filter((lote: any) => lote.cobros.length > 0);

    let pendientes = lotes.length;
    let generados = 0;

    lotes.forEach((lote: any) => {
      const cobros = lote.cobros.map((cobro: any) => ({ ...cobro, id_asistencia: this.id }));

      this.motorCobrosService.ejecutar({
        cobros: cobros,
        id_estudiante: this.movimiento.id_estudiante,
        id_usuario: idUsuario,
        fecha: this.movimiento.fecha,
        tipo_asistencia: lote.tipo,
        // El aviso al acudiente lo manda después este mismo módulo, con el
        // mensaje de corrección.
        notificar: false
      }).subscribe({
        next: (ejecucion: any) => {
          generados += ejecucion.cobros_generados || 0;
          pendientes--;
          if (pendientes === 0) {
            this.notificar(idUsuario, generados);
          }
        },
        error: () => {
          pendientes--;
          if (pendientes === 0) {
            this.notificar(idUsuario, generados);
          }
        }
      });
    });
  }

  private notificar(idUsuario: any, cobrosGenerados: number) {
    this.asistenciaEdicionService.notificarCorreccion(this.id, idUsuario).subscribe({
      next: () => this.terminar(cobrosGenerados),
      // Si la notificación falla, la corrección ya quedó guardada: no se
      // devuelve nada, solo se sigue.
      error: () => this.terminar(cobrosGenerados)
    });
  }

  private terminar(cobrosGenerados: number) {
    this.guardando = false;

    const detalle = cobrosGenerados > 0
      ? `La corrección quedó guardada y se generaron ${cobrosGenerados} cobro(s).`
      : 'La corrección quedó guardada.';

    Swal.fire('Listo', detalle, 'success').then(() => {
      this.router.navigate(['operaciones/editar-asistencia']);
    });
  }
}
