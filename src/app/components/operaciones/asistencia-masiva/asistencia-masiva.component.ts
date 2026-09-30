import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { BuscarComponent } from '../../../common/buscar/buscar.component';
import { AsistenciaMasivaService } from '../../../services/asistencia-masiva.service';
import { GruposService } from '../../../services/grupos.service';
import { ColaboradoresService } from '../../../services/colaboradores.service';
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
  imports: [CommonModule, FormsModule, HeaderComponent, BuscarComponent]
})
export class AsistenciaMasivaComponent implements OnInit {

  titulo = "Asistencia Masiva";

  public grupos = [] as any[];
  public idGrupo: any = null;

  // Búsqueda por nombre. Igual que el grupo, filtra en pantalla: no vuelve a
  // pedirle nada al servidor ni pierde lo que ya se trabajó.
  public busqueda: string = '';
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

  // Colaborador que recibe (ingreso) o entrega (salida) a todo el lote.
  // Arranca en el del usuario y cada fila lo puede cambiar.
  public colaboradores = [] as any[];
  public colaboradorGeneral: any = null;

  // Último colaborador general que se copió a las filas. Igual que con la
  // observación: sirve para no pisar la fila que la usuaria cambió a mano.
  private colaboradorAplicado: any = null;

  // Último texto general que se copió a las filas. Sirve para distinguir la
  // fila que tiene la observación general de la que la usuaria escribió aparte.
  private observacionAplicada: string = '';

  public cargando: boolean = false;
  public procesando: boolean = false;
  public evaluandoCobros: boolean = false;

  // Se enciende cuando se intenta registrar con filas incompletas. Desde ahí
  // cada fila marcada muestra en rojo lo que le falta, y la marca se quita
  // sola apenas se corrige.
  public mostrarFaltantes: boolean = false;

  constructor(
    private asistenciaMasivaService: AsistenciaMasivaService,
    private gruposService: GruposService,
    private utilService: UtilService,
    private colaboradoresService: ColaboradoresService
  ) { }

  ngOnInit(): void {
    this.fecha = this.obtenerFechaActual();
    this.consultaGrupos();
    this.consultaColaboradores();
    this.consultarCandidatos();
  }

  consultaColaboradores() {
    this.colaboradoresService.obtenerPorFiltros({ estado: 'activo' }).subscribe({
      next: (response: any) => {
        this.colaboradores = (response.body as any[]) || [];
        this.colaboradorGeneral = this.colaboradorDelUsuario();
        // Si la grilla llegó primero, sus filas quedaron sin colaborador.
        this.aplicarColaboradorGeneral();
      },
      error: () => {
        this.colaboradores = [];
      }
    });
  }

  /**
   * Colaborador del usuario que registra: por el id_colaborador de la sesión
   * o, si no viene, por la persona. Si no es colaborador queda sin especificar.
   */
  private colaboradorDelUsuario(): any {
    const idColaborador = this.utilService.obtenerIdColaboradorActual();
    if (idColaborador && this.colaboradores.some((c: any) => c.id == idColaborador)) {
      return idColaborador;
    }

    const idPersona = this.utilService.obtenerIdPersonaActual();
    const colaborador = idPersona
      ? this.colaboradores.find((c: any) => c.id_persona == idPersona)
      : null;

    return colaborador ? colaborador.id : null;
  }

  /**
   * Copia el colaborador general a las filas de las dos pestañas. Solo pisa
   * las que siguen con el general anterior o sin colaborador.
   */
  aplicarColaboradorGeneral() {
    const listas = [this.candidatos, ...Object.values(this.cache)];

    listas.forEach((lista: any[]) => {
      (lista || []).forEach((fila: any) => {
        if (fila.id_colaborador === null || fila.id_colaborador === undefined || fila.id_colaborador === this.colaboradorAplicado) {
          fila.id_colaborador = this.colaboradorGeneral;
        }
      });
    });

    this.colaboradorAplicado = this.colaboradorGeneral;
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
    this.mostrarFaltantes = false;

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
    this.mostrarFaltantes = false;
    this.consultarCandidatos();
  }

  /**
   * El grupo NO va al servidor: los estudiantes ya están todos cargados, así
   * que filtrar es solo ocultar filas. Además, así no se pierden las horas ni
   * los cobros que la usuaria llevaba trabajados.
   */
  get candidatosVisibles(): any[] {
    let visibles = this.candidatos;

    if (this.idGrupo !== null && this.idGrupo !== '') {
      visibles = visibles.filter((fila: any) => fila.id_grupo === this.idGrupo);
    }

    const termino = this.normalizar(this.busqueda);

    if (termino !== '') {
      visibles = visibles.filter((fila: any) => this.normalizar(this.nombreCompleto(fila)).includes(termino));
    }

    return visibles;
  }

  buscar(texto: any) {
    this.busqueda = texto ? String(texto) : '';
  }

  nombreCompleto(fila: any): string {
    return [
      fila.primer_nombre,
      fila.segundo_nombre,
      fila.primer_apellido,
      fila.segundo_apellido
    ].filter((parte: any) => !!parte).join(' ');
  }

  /**
   * Sin tildes y en minúsculas, para que buscar "nicolas" encuentre a
   * "Nicolás".
   */
  private normalizar(texto: string): string {
    return (texto || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
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
          // Colaborador que recibe o entrega y persona que trae o recoge. La
          // persona arranca en la última elección del niño.
          id_colaborador: this.colaboradorGeneral,
          personas: (fila.personas || []) as any[],
          id_persona: fila.id_persona_sugerida || null,
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
      // Los que ya estaban marcados conservan lo que tengan.
      if (marcar && !fila.marcado) {
        fila.marcado = true;
        this.completarFilaAlMarcar(fila);
        return;
      }

      // Desmarcar no borra nada: la fila conserva hora, colaborador y
      // observación por si se vuelve a marcar. Solo se registran los marcados.
      fila.marcado = marcar;
    });

    // Las filas que se acaban de marcar también reciben la observación general.
    if (marcar && this.observacionGeneral.trim() !== '') {
      this.aplicarObservacionGeneral();
    }
  }

  /**
   * Marcar completa la fila con lo de arriba. Quitar el check NO borra lo que
   * tenga la fila: si se vuelve a marcar, ahí sigue. Solo se registran los
   * marcados. Marcar tampoco va al back: los cobros se calculan únicamente
   * con el botón "Calcular cobros extra".
   */
  onMarcadoCambiado(fila: any) {
    if (!fila.marcado) {
      return;
    }

    this.completarFilaAlMarcar(fila);
    if (this.observacionGeneral.trim() !== '') {
      this.aplicarObservacionGeneral();
    }
  }

  /**
   * Al marcar un niño se le copia lo que haya en la parte de arriba: la hora
   * general si la fila no tiene hora, y el colaborador general si la fila no
   * tiene colaborador. Así da igual si se puso primero la hora o primero los
   * checks. Lo que la usuaria ya escribió en la fila no se pisa.
   */
  private completarFilaAlMarcar(fila: any) {
    if (this.horaGeneral && !fila.hora) {
      fila.hora = this.horaGeneral;
      fila.horaEvaluada = null;
      this.limpiarCobrosFila(fila);
    }

    if (fila.id_colaborador === null || fila.id_colaborador === undefined) {
      fila.id_colaborador = this.colaboradorGeneral;
    }
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
   * La hora general se copia a todas las filas visibles que estén sin hora,
   * marcadas o no. No las marca: solo se registran las que la usuaria marque.
   * La fila que ya tenga una hora propia se respeta.
   */
  aplicarHoraGeneral() {
    if (!this.horaGeneral) {
      return;
    }

    this.candidatosVisibles.forEach((fila: any) => {
      if (!fila.hora) {
        fila.hora = this.horaGeneral;
        fila.horaEvaluada = null;
        this.limpiarCobrosFila(fila);
      }
    });
  }

  /**
   * Al cambiar la hora de una fila, sus cobros dejan de servir.
   */
  limpiarCobrosFila(fila: any) {
    fila.cobros = [];
    fila.cobrosEvaluados = false;
  }

  /**
   * Cambio manual de la hora de una fila.
   *
   * Poner una hora es la señal de que ese niño va en el lote, así que se
   * marca. No va al back: si la hora cambió, los cobros que tuviera calculados
   * dejan de servir y quedan en "Sin calcular" hasta que se use el botón
   * "Calcular cobros extra".
   */
  recalcularFila(fila: any) {
    if (fila.horaEvaluada !== fila.hora) {
      this.limpiarCobrosFila(fila);
      fila.horaEvaluada = null;
    }

    if (!fila.hora || fila.marcado) {
      return;
    }

    fila.marcado = true;
    this.onMarcadoCambiado(fila);
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

    const incompletas = filas.filter((fila: any) => this.faltantesFila(fila).length > 0);
    if (incompletas.length > 0) {
      this.mostrarFaltantes = true;

      const lista = incompletas
        .map((fila: any) => `• <b>${this.escaparHtml(this.nombreCompleto(fila))}</b>: falta ${this.faltantesFila(fila).join(', ').toLowerCase()}`)
        .join('<br>');

      Swal.fire({
        title: 'Faltan datos',
        html: `Completa estos estudiante(s) antes de registrar. Quedaron marcados en rojo:<br><br><div class="text-start">${lista}</div>`,
        icon: 'warning'
      }).then(() => this.irAPrimeraIncompleta(incompletas[0]));
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

  /**
   * Lo que le falta a una fila marcada para poder registrarse: la hora y el
   * colaborador que recibe (ingreso) o entrega (salida). Quién lo trae o lo
   * recoge es opcional.
   */
  faltantesFila(fila: any): string[] {
    const faltantes: string[] = [];
    const esSalida = this.tipo === 'salida';

    if (!fila.hora) {
      faltantes.push('Hora');
    }
    if (!fila.id_colaborador) {
      faltantes.push(esSalida ? 'Colaborador que entrega' : 'Colaborador que recibe');
    }

    return faltantes;
  }

  /** true si la fila se debe pintar como incompleta. */
  filaIncompleta(fila: any): boolean {
    return this.mostrarFaltantes && fila.marcado && this.faltantesFila(fila).length > 0;
  }

  /** Lleva la pantalla a la primera fila incompleta para ubicarla rápido. */
  private irAPrimeraIncompleta(fila: any) {
    const elemento = document.getElementById('fila-masiva-' + fila.id_estudiante);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private escaparHtml(texto: string): string {
    return String(texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private enviarLote(filas: any[]) {
    this.procesando = true;

    // Nombre de cada niño del lote, para que el resultado diga a quién no se
    // le pudo registrar y no solo el motivo.
    const nombres = new Map<string, string>();
    filas.forEach((fila: any) => nombres.set(String(fila.id_estudiante), this.nombreCompleto(fila)));

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    const payload = filas.map((fila: any) => ({
      id_estudiante: fila.id_estudiante,
      id_asistencia: fila.id_asistencia || null,
      hora: fila.hora,
      observacion: fila.observacion,
      id_colaborador: fila.id_colaborador || null,
      id_persona: fila.id_persona || null,
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
        this.terminar(respuesta, respuesta.cobros_generados || 0, nombres);
      },
      error: () => {
        this.procesando = false;
        Swal.fire('Atención', 'No se pudo procesar el lote.', 'error');
      }
    });
  }

  private terminar(respuestaLote: any, cobrosGenerados: number, nombres: Map<string, string> = new Map()) {
    this.procesando = false;
    this.mostrarFaltantes = false;

    const procesados = respuestaLote.procesados || 0;
    const total = respuestaLote.total || 0;
    const fallidos = (respuestaLote.resultados as any[] || []).filter((r: any) => !r.procesado);

    let detalle = `Se registraron ${procesados} de ${total}.`;
    if (cobrosGenerados > 0) {
      detalle += `<br>Se generaron ${cobrosGenerados} cobro(s).`;
    }
    if (fallidos.length > 0) {
      detalle += '<br><br><b>No se pudieron procesar:</b><br>'
        + fallidos.map((r: any) => {
          const nombre = nombres.get(String(r.id_estudiante));
          return nombre ? `• <b>${this.escaparHtml(nombre)}</b>: ${r.motivo}` : `• ${r.motivo}`;
        }).join('<br>');
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