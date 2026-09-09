import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { AsistenciaMasivaService } from '../../../services/asistencia-masiva.service';
import { MotorCobrosAutomaticosService } from '../../../services/motor-cobros-automaticos.service';
import { GruposService } from '../../../services/grupos.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';

/**
 * Registro masivo de asistencia.
 *
 * Son dos procesos separados y excluyentes:
 *   - Ingreso: lista los estudiantes activos que no tienen movimiento abierto
 *     en la fecha. Es el único que crea el movimiento.
 *   - Salida: lista los que sí lo tienen. Solo lo cierra.
 * Un estudiante nunca sale en los dos al tiempo, así que no hay forma de
 * ingresarlo dos veces desde aquí.
 *
 * Esta pantalla NO avisa al portal de padres: es una carga administrativa,
 * casi siempre de días anteriores.
 */
@Component({
  selector: 'app-asistencia-masiva',
  templateUrl: './asistencia-masiva.component.html',
  styleUrl: './asistencia-masiva.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class AsistenciaMasivaComponent implements OnInit {

  titulo = "Asistencia Masiva";

  public grupos = [] as any[];
  public idGrupo: any = null;
  public fecha: string = '';

  // 'ingreso' o 'salida'. Son dos procesos distintos, no dos vistas de lo mismo.
  public tipo: string = 'ingreso';

  public candidatos = [] as any[];

  // Hora que se aplica a todos los marcados. Cada fila puede tener la suya y
  // esa manda sobre la general.
  public horaGeneral: string = '';
  public observacionGeneral: string = '';

  public cargando: boolean = false;
  public procesando: boolean = false;
  public evaluandoCobros: boolean = false;

  // Cuántas peticiones al motor de cobros se lanzan a la vez. Se limita para
  // no abrirle veinte conexiones al servidor de un solo golpe.
  private readonly tamanoLote = 5;

  constructor(
    private asistenciaMasivaService: AsistenciaMasivaService,
    private motorCobrosService: MotorCobrosAutomaticosService,
    private gruposService: GruposService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.fecha = this.obtenerFechaActual();
    this.consultaGrupos();
    this.consultarCandidatos();
  }

  /**
   * Fecha de hoy en YYYY-MM-DD con hora local.
   * No usar toISOString(): convierte a UTC y desfasa el día.
   */
  private obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  consultaGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = (response.body as any[]) || [];
      },
      error: () => {
        this.grupos = [];
      }
    });
  }

  cambiarTipo(tipo: string) {
    if (this.tipo === tipo) {
      return;
    }
    this.tipo = tipo;
    this.horaGeneral = '';
    this.consultarCandidatos();
  }

  consultarCandidatos() {
    if (!this.fecha) {
      return;
    }

    this.cargando = true;
    this.candidatos = [];

    this.asistenciaMasivaService.obtenerCandidatos(this.fecha, this.idGrupo, this.tipo).subscribe({
      next: (respuesta: any) => {
        const lista = (respuesta.candidatos as any[]) || [];

        this.candidatos = lista.map((fila: any) => ({
          ...fila,
          // La grilla arranca sin nadie marcado: la usuaria decide a quiénes
          // les corresponde el movimiento.
          marcado: false,
          hora: this.horaSugerida(fila),
          observacion: '',
          // Los útiles vienen todos marcados, como se pidió: en el ingreso
          // significa "lo trajo" y en la salida "se lo lleva".
          utiles: (fila.utiles || []).map((util: any) => ({
            ...util,
            marcado: true
          })),
          cobros: [] as any[],
          cobrosEvaluados: false,
          resultado: null as any
        }));

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.candidatos = [];
        Swal.fire('Atención', 'No se pudieron consultar los estudiantes de esa fecha.', 'error');
      }
    });
  }

  /**
   * Hora con la que arranca cada fila: la programada del estudiante, que es
   * justamente la que no genera cobro.
   */
  private horaSugerida(fila: any): string {
    const hora = this.tipo === 'salida'
      ? fila.hora_salida_programada
      : fila.hora_entrada_programada;

    return hora ? String(hora).substring(0, 5) : '';
  }

  get marcados(): any[] {
    return this.candidatos.filter((fila: any) => fila.marcado);
  }

  get totalMarcados(): number {
    return this.marcados.length;
  }

  get todosMarcados(): boolean {
    return this.candidatos.length > 0 && this.marcados.length === this.candidatos.length;
  }

  alternarTodos() {
    const marcar = !this.todosMarcados;
    this.candidatos.forEach((fila: any) => fila.marcado = marcar);
  }

  /**
   * La hora general se copia a los marcados. La fila que ya tenga una hora
   * escrita a mano también se sobreescribe: si la usuaria puso la hora arriba
   * es porque quiere esa para todos.
   */
  aplicarHoraGeneral() {
    if (!this.horaGeneral) {
      return;
    }
    this.marcados.forEach((fila: any) => fila.hora = this.horaGeneral);
    this.limpiarCobros();
  }

  /**
   * Al cambiar la hora de una fila, sus cobros dejan de servir.
   */
  limpiarCobrosFila(fila: any) {
    fila.cobros = [];
    fila.cobrosEvaluados = false;
  }

  private limpiarCobros() {
    this.candidatos.forEach((fila: any) => this.limpiarCobrosFila(fila));
  }

  alternarUtil(util: any) {
    util.marcado = !util.marcado;
  }

  /**
   * Calcula los cobros extra de los marcados usando el mismo motor de la
   * pantalla de asistencia. Se hace por estudiante, en tandas, porque el
   * endpoint del motor trabaja de a uno.
   */
  calcularCobros() {
    const filas = this.marcados.filter((fila: any) => fila.hora);

    if (filas.length === 0) {
      Swal.fire('Atención', 'Marca al menos un estudiante y ponle la hora.', 'warning');
      return;
    }

    this.evaluandoCobros = true;
    this.evaluarTanda(filas, 0);
  }

  /**
   * Evalúa de a `tamanoLote` filas y sigue con la siguiente tanda cuando
   * terminan todas las de la actual.
   */
  private evaluarTanda(filas: any[], desde: number) {
    if (desde >= filas.length) {
      this.evaluandoCobros = false;
      const conCobros = filas.filter((fila: any) => fila.cobros.length > 0).length;
      Swal.fire(
        'Listo',
        conCobros === 0
          ? 'Ninguno de los marcados genera cobro extra.'
          : `${conCobros} de ${filas.length} generan cobro extra. Revísalos antes de procesar.`,
        'success'
      );
      return;
    }

    const tanda = filas.slice(desde, desde + this.tamanoLote);
    let pendientes = tanda.length;

    const seguir = () => {
      pendientes--;
      if (pendientes === 0) {
        this.evaluarTanda(filas, desde + this.tamanoLote);
      }
    };

    tanda.forEach((fila: any) => {
      this.motorCobrosService.evaluar({
        id_estudiante: fila.id_estudiante,
        tipo_evento: this.tipo,
        hora: fila.hora,
        fecha: this.fecha
      }).subscribe({
        next: (respuesta: any) => {
          const cobros = (respuesta.cobros as any[]) || [];
          // Llegan aceptados: la usuaria desmarca los que no quiere.
          fila.cobros = cobros.map((cobro: any) => ({ ...cobro, aceptado: true }));
          fila.cobrosEvaluados = true;
          seguir();
        },
        error: () => {
          fila.cobros = [];
          fila.cobrosEvaluados = true;
          seguir();
        }
      });
    });
  }

  totalCobrosFila(fila: any): number {
    return (fila.cobros || [])
      .filter((cobro: any) => cobro.aceptado)
      .reduce((suma: number, cobro: any) => suma + Number(cobro.valor || 0), 0);
  }

  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  }

  /**
   * Procesa el lote y, con los movimientos ya creados, ejecuta los cobros que
   * quedaron aceptados. Los cobros van con notificar en false, igual que el
   * resto de esta pantalla.
   */
  procesar() {
    const filas = this.marcados;

    if (filas.length === 0) {
      Swal.fire('Atención', 'No has marcado ningún estudiante.', 'warning');
      return;
    }

    const sinHora = filas.filter((fila: any) => !fila.hora);
    if (sinHora.length > 0) {
      Swal.fire('Atención', `Hay ${sinHora.length} estudiante(s) marcados sin hora.`, 'warning');
      return;
    }

    const verbo = this.tipo === 'salida' ? 'la salida' : 'el ingreso';

    Swal.fire({
      title: '¿Procesar?',
      html: `Se va a registrar ${verbo} de <b>${filas.length}</b> estudiante(s) con fecha <b>${this.fecha}</b>.<br><br>`
        + 'No se le envía notificación al acudiente.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, procesar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }
      this.enviarLote(filas);
    });
  }

  private enviarLote(filas: any[]) {
    this.procesando = true;

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    const payload = filas.map((fila: any) => ({
      id_estudiante: fila.id_estudiante,
      id_asistencia: fila.id_asistencia || null,
      hora: fila.hora,
      observacion: fila.observacion,
      utiles: (fila.utiles || []).map((util: any) => ({
        id: util.id,
        id_util_diario: util.id_util_diario,
        nombre_libre: util.nombre_libre,
        // En el ingreso lo marcado es lo que trajo; en la salida, lo que se lleva.
        trajo: this.tipo === 'salida' ? util.trajo : (util.marcado ? 1 : 0),
        regreso: this.tipo === 'salida' ? (util.marcado ? 1 : 0) : null
      }))
    }));

    this.asistenciaMasivaService.procesar(
      this.fecha,
      this.tipo,
      idUsuario,
      this.observacionGeneral,
      payload
    ).subscribe({
      next: (respuesta: any) => {
        const resultados = (respuesta.resultados as any[]) || [];
        this.ejecutarCobros(filas, resultados, idUsuario, respuesta);
      },
      error: () => {
        this.procesando = false;
        Swal.fire('Atención', 'No se pudo procesar el lote.', 'error');
      }
    });
  }

  /**
   * Ejecuta los cobros aceptados de las filas que sí quedaron procesadas.
   * Si una falla, el movimiento ya quedó: se avisa al final sin devolver nada.
   */
  private ejecutarCobros(filas: any[], resultados: any[], idUsuario: any, respuestaLote: any) {
    const porEstudiante = new Map<string, any>();
    resultados.forEach((resultado: any) => porEstudiante.set(String(resultado.id_estudiante), resultado));

    const pendientes = filas
      .map((fila: any) => ({ fila: fila, resultado: porEstudiante.get(String(fila.id_estudiante)) }))
      .filter((item: any) => item.resultado && item.resultado.procesado)
      .filter((item: any) => (item.fila.cobros || []).some((cobro: any) => cobro.aceptado));

    if (pendientes.length === 0) {
      this.terminar(respuestaLote, 0);
      return;
    }

    let porResolver = pendientes.length;
    let cobrosOk = 0;

    pendientes.forEach((item: any) => {
      const cobros = item.fila.cobros
        .filter((cobro: any) => cobro.aceptado)
        .map((cobro: any) => ({ ...cobro, id_asistencia: item.resultado.id_asistencia }));

      this.motorCobrosService.ejecutar({
        cobros: cobros,
        id_estudiante: item.fila.id_estudiante,
        id_usuario: idUsuario,
        fecha: this.fecha,
        tipo_asistencia: this.tipo,
        notificar: false
      }).subscribe({
        next: () => {
          cobrosOk++;
          porResolver--;
          if (porResolver === 0) {
            this.terminar(respuestaLote, cobrosOk);
          }
        },
        error: () => {
          porResolver--;
          if (porResolver === 0) {
            this.terminar(respuestaLote, cobrosOk);
          }
        }
      });
    });
  }

  private terminar(respuestaLote: any, cobrosOk: number) {
    this.procesando = false;

    const procesados = respuestaLote.procesados || 0;
    const total = respuestaLote.total || 0;
    const fallidos = (respuestaLote.resultados as any[] || []).filter((r: any) => !r.procesado);

    let detalle = `Se registraron ${procesados} de ${total}.`;
    if (cobrosOk > 0) {
      detalle += `<br>Se generaron cobros a ${cobrosOk} estudiante(s).`;
    }
    if (fallidos.length > 0) {
      detalle += '<br><br><b>No se pudieron procesar:</b><br>'
        + fallidos.map((r: any) => `• ${r.motivo}`).join('<br>');
    }

    Swal.fire({
      title: fallidos.length > 0 ? 'Procesado con novedades' : 'Listo',
      html: detalle,
      icon: fallidos.length > 0 ? 'warning' : 'success'
    });

    this.horaGeneral = '';
    this.observacionGeneral = '';
    this.consultarCandidatos();
  }
}
