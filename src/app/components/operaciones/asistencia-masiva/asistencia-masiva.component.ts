import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { AsistenciaMasivaService } from '../../../services/asistencia-masiva.service';
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

  // Cada proceso guarda su propia grilla. Cambiar de pestaña no vuelve a
  // pedirle nada al servidor ni pierde las horas, observaciones y cobros que
  // ya se hayan trabajado. Solo se descartan al cambiar la fecha o el grupo,
  // y después de procesar, porque ahí sí cambió lo que hay en la base.
  private cache: { [tipo: string]: any[] } = {};

  // Hora que se aplica a todos los marcados. Cada fila puede tener la suya y
  // esa manda sobre la general.
  public horaGeneral: string = '';
  public observacionGeneral: string = '';

  // Último texto general que se copió a las filas. Sirve para distinguir la
  // fila que tiene la observación general de la que la usuaria escribió aparte.
  private observacionAplicada: string = '';

  public cargando: boolean = false;
  public procesando: boolean = false;
  public evaluandoCobros: boolean = false;

  constructor(
    private asistenciaMasivaService: AsistenciaMasivaService,
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

    // Se guarda lo que la usuaria llevaba en la pestaña que deja.
    this.cache[this.tipo] = this.candidatos;

    this.tipo = tipo;
    this.horaGeneral = '';
    this.observacionAplicada = '';

    if (this.cache[tipo]) {
      this.candidatos = this.cache[tipo];
      return;
    }

    this.consultarCandidatos();
  }

  /**
   * Cambio de fecha: lo que había en las dos pestañas ya no corresponde, así
   * que se descarta y se vuelve a consultar.
   */
  cambiarFecha() {
    this.cache = {};
    this.consultarCandidatos();
  }

  /**
   * El grupo NO va al servidor: los estudiantes ya están todos cargados, así
   * que filtrar es solo ocultar filas. Además, así no se pierden las horas ni
   * los cobros que la usuaria llevaba trabajados.
   */
  get candidatosVisibles(): any[] {
    if (this.idGrupo === null || this.idGrupo === '') {
      return this.candidatos;
    }
    return this.candidatos.filter((fila: any) => fila.id_grupo === this.idGrupo);
  }

  consultarCandidatos() {
    if (!this.fecha) {
      return;
    }

    this.cargando = true;
    this.candidatos = [];

    this.traerCandidatos(this.tipo, (lista: any[] | null) => {
      this.cargando = false;

      if (lista === null) {
        this.candidatos = [];
        Swal.fire('Atención', 'No se pudieron consultar los estudiantes de esa fecha.', 'error');
        return;
      }

      this.candidatos = lista;
      this.observacionAplicada = '';
    });
  }

  /**
   * Trae la grilla de un proceso y la deja lista en la caché.
   *
   * El `tipo` va por parámetro y no se toma de `this.tipo` porque después de
   * procesar se recargan los dos procesos, no solo el que está a la vista.
   * Llama al callback con la lista, o con null si falló.
   */
  private traerCandidatos(tipo: string, listo: (lista: any[] | null) => void) {
    // Siempre se piden todos los grupos: el filtro de grupo es de pantalla.
    this.asistenciaMasivaService.obtenerCandidatos(this.fecha, null, tipo).subscribe({
      next: (respuesta: any) => {
        const crudas = (respuesta.candidatos as any[]) || [];

        const lista = crudas.map((fila: any) => ({
          ...fila,
          // La grilla arranca sin nadie marcado y sin horas: así nadie se
          // procesa por inercia. La hora del horario queda solo como ayuda en
          // el tooltip del campo.
          marcado: false,
          hora: '',
          horaSugerida: this.horaSugerida(fila, tipo),
          observacion: '',
          // Los útiles vienen todos marcados, como se pidió: en el ingreso
          // significa "lo trajo" y en la salida "se lo lleva".
          utiles: (fila.utiles || []).map((util: any) => ({
            ...util,
            marcado: true
          })),
          cobros: [] as any[],
          cobrosEvaluados: false,
          // Hora con la que se evaluaron los cobros de esta fila, para no
          // repetir la consulta si se sale del campo sin haberla tocado.
          horaEvaluada: null as any,
          evaluando: false,
          resultado: null as any
        }));

        this.cache[tipo] = lista;
        listo(lista);
      },
      error: () => {
        listo(null);
      }
    });
  }

  /**
   * Hora programada del estudiante para ese día, la que no genera cobro. No se
   * pone en el campo: se muestra como ayuda en el tooltip.
   */
  private horaSugerida(fila: any, tipo: string): string {
    const hora = tipo === 'salida'
      ? fila.hora_salida_programada
      : fila.hora_entrada_programada;

    return hora ? String(hora).substring(0, 5) : '';
  }

  // Todo lo que se cuenta y se procesa sale de lo que está a la vista: si hay
  // un grupo filtrado, nadie de otro grupo entra al lote sin que se vea.
  get marcados(): any[] {
    return this.candidatosVisibles.filter((fila: any) => fila.marcado);
  }

  get totalMarcados(): number {
    return this.marcados.length;
  }

  get todosMarcados(): boolean {
    const visibles = this.candidatosVisibles;
    return visibles.length > 0 && this.marcados.length === visibles.length;
  }

  alternarTodos() {
    const marcar = !this.todosMarcados;

    this.candidatosVisibles.forEach((fila: any) => {
      fila.marcado = marcar;
      if (!marcar) {
        this.limpiarFila(fila);
      }
    });

    // Las filas que se acaban de marcar también reciben la observación general.
    if (marcar && this.observacionGeneral.trim() !== '') {
      this.aplicarObservacionGeneral();
    }
  }

  /**
   * Quitar el check deja la fila como estaba al abrir la pantalla: sin hora y
   * sin cobros. Si no, quedaba una hora escrita que ya no se iba a usar y
   * confundía.
   */
  onMarcadoCambiado(fila: any) {
    if (fila.marcado) {
      if (this.observacionGeneral.trim() !== '') {
        this.aplicarObservacionGeneral();
      }
      return;
    }

    this.limpiarFila(fila);
  }

  private limpiarFila(fila: any) {
    fila.hora = '';
    fila.horaEvaluada = null;
    this.limpiarCobrosFila(fila);
  }

  /**
   * La observación general se va copiando a los marcados mientras se escribe.
   *
   * Se lleva el último valor aplicado para no pisar lo que la usuaria haya
   * escrito a mano en una fila: solo se sobreescribe la fila que todavía tiene
   * el texto general anterior o que está vacía.
   */
  aplicarObservacionGeneral() {
    this.candidatosVisibles.forEach((fila: any) => {
      if (!fila.marcado) {
        return;
      }

      const propia = (fila.observacion || '').trim();

      if (propia === '' || propia === this.observacionAplicada) {
        fila.observacion = this.observacionGeneral;
      }
    });

    this.observacionAplicada = this.observacionGeneral;
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
    this.marcados.forEach((fila: any) => {
      fila.hora = this.horaGeneral;
      fila.horaEvaluada = null;
    });
    this.limpiarCobros();
  }

  /**
   * Al cambiar la hora de una fila, sus cobros dejan de servir.
   */
  limpiarCobrosFila(fila: any) {
    fila.cobros = [];
    fila.cobrosEvaluados = false;
  }

  /**
   * Recalcula los cobros de una sola fila al salir del campo de la hora.
   *
   * Va con (blur) y no con (change): el input type="time" dispara change
   * apenas se escribe la primera parte de la hora y se ponía a calcular a
   * medias.
   */
  recalcularFila(fila: any) {
    if (!fila.hora) {
      this.limpiarCobrosFila(fila);
      fila.horaEvaluada = null;
      return;
    }

    // Poner una hora es la señal de que ese niño va en el lote. Marcarlo solo
    // evita el caso de escribir la hora, darle procesar y que no pase nada
    // porque el check estaba apagado.
    fila.marcado = true;

    if (this.observacionGeneral.trim() !== '') {
      this.aplicarObservacionGeneral();
    }

    // Si la hora no se movió no hay nada que volver a pedir.
    if (fila.horaEvaluada === fila.hora) {
      return;
    }

    this.limpiarCobrosFila(fila);
    fila.evaluando = true;

    this.asistenciaMasivaService.evaluarCobros(this.fecha, this.tipo, [
      { id_estudiante: fila.id_estudiante, hora: fila.hora }
    ]).subscribe({
      next: (respuesta: any) => {
        const evaluacion = ((respuesta.evaluaciones as any[]) || [])[0];
        const cobros = evaluacion ? (evaluacion.cobros || []) : [];

        fila.cobros = cobros.map((cobro: any) => ({ ...cobro, aceptado: true }));
        fila.cobrosEvaluados = true;
        fila.horaEvaluada = fila.hora;
        fila.evaluando = false;
      },
      error: () => {
        fila.cobrosEvaluados = true;
        fila.evaluando = false;
      }
    });
  }

  private limpiarCobros() {
    this.candidatosVisibles.forEach((fila: any) => this.limpiarCobrosFila(fila));
  }

  alternarUtil(util: any) {
    util.marcado = !util.marcado;
  }

  /**
   * Calcula los cobros extra de los marcados. Va todo en una sola petición: el
   * backend recorre los estudiantes por dentro con el mismo motor de la
   * pantalla de asistencia.
   */
  calcularCobros() {
    const filas = this.marcados.filter((fila: any) => fila.hora);

    if (filas.length === 0) {
      Swal.fire('Atención', 'Marca al menos un estudiante y ponle la hora.', 'warning');
      return;
    }

    this.evaluandoCobros = true;

    const payload = filas.map((fila: any) => ({
      id_estudiante: fila.id_estudiante,
      hora: fila.hora
    }));

    this.asistenciaMasivaService.evaluarCobros(this.fecha, this.tipo, payload).subscribe({
      next: (respuesta: any) => {
        const evaluaciones = (respuesta.evaluaciones as any[]) || [];
        const porEstudiante = new Map<string, any>();
        evaluaciones.forEach((e: any) => porEstudiante.set(String(e.id_estudiante), e));

        filas.forEach((fila: any) => {
          const evaluacion = porEstudiante.get(String(fila.id_estudiante));
          const cobros = evaluacion ? (evaluacion.cobros || []) : [];

          // Llegan aceptados: la usuaria desmarca los que no quiere.
          fila.cobros = cobros.map((cobro: any) => ({ ...cobro, aceptado: true }));
          fila.cobrosEvaluados = true;
          fila.horaEvaluada = fila.hora;
        });

        this.evaluandoCobros = false;

        const conCobros = filas.filter((fila: any) => fila.cobros.length > 0).length;
        const conError = evaluaciones.filter((e: any) => e.error).length;

        let detalle = conCobros === 0
          ? 'Ninguno de los marcados genera cobro extra.'
          : `${conCobros} de ${filas.length} generan cobro extra. Revísalos antes de procesar.`;

        // Si el motor falló para alguien, esa fila queda sin cobros: hay que
        // decirlo, porque en pantalla se ve igual que "no genera cobro".
        if (conError > 0) {
          detalle += `<br><br>No se pudo evaluar a ${conError} estudiante(s); esas filas quedaron sin cobro.`;
        }

        Swal.fire({
          title: conError > 0 ? 'Calculado con novedades' : 'Listo',
          html: detalle,
          icon: conError > 0 ? 'warning' : 'success'
        });
      },
      error: () => {
        this.evaluandoCobros = false;
        Swal.fire('Atención', 'No se pudieron calcular los cobros extra.', 'error');
      }
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
      })),
      // Solo los que la usuaria dejó marcados. El backend los genera en la
      // misma petición, después de crear el movimiento.
      cobros: (fila.cobros || []).filter((cobro: any) => cobro.aceptado)
    }));

    this.asistenciaMasivaService.procesar(
      this.fecha,
      this.tipo,
      idUsuario,
      this.observacionGeneral,
      payload
    ).subscribe({
      next: (respuesta: any) => {
        this.terminar(respuesta, respuesta.cobros_generados || 0);
      },
      error: () => {
        this.procesando = false;
        Swal.fire('Atención', 'No se pudo procesar el lote.', 'error');
      }
    });
  }

  private terminar(respuestaLote: any, cobrosGenerados: number) {
    this.procesando = false;

    const procesados = respuestaLote.procesados || 0;
    const total = respuestaLote.total || 0;
    const fallidos = (respuestaLote.resultados as any[] || []).filter((r: any) => !r.procesado);

    let detalle = `Se registraron ${procesados} de ${total}.`;
    if (cobrosGenerados > 0) {
      detalle += `<br>Se generaron ${cobrosGenerados} cobro(s).`;
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

    // Después de procesar cambió la base y las dos pestañas quedaron viejas:
    // los que acaban de salir ahora pueden volver a ingresar, y al revés. Por
    // eso se recargan las dos, no solo la que está a la vista.
    this.cache = {};
    this.consultarCandidatos();
    this.traerCandidatos(this.tipo === 'salida' ? 'ingreso' : 'salida', () => { });
  }
}
