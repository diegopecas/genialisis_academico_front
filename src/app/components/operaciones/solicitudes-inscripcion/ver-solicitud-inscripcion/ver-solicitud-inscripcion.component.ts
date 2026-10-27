// ========== ver-solicitud-inscripcion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../../common/searchable-dropdown/searchable-dropdown.component';
import { SolicitudesInscripcionPublicaService } from '../../../../services/solicitudes-inscripcion-publica.service';
import { LinksPagoService } from '../../../../services/links-pago.service';
import { CursosExtraService } from '../../../../services/cursos-extra.service';
import { TarifasCursosExtraService } from '../../../../services/tarifas-cursos-extra.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ver-solicitud-inscripcion',
  templateUrl: './ver-solicitud-inscripcion.component.html',
  styleUrl: './ver-solicitud-inscripcion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent]
})
export class VerSolicitudInscripcionComponent implements OnInit {

  public titulo = 'Solicitud de Inscripción';
  public regresar = '/operaciones/solicitudes-inscripcion';
  public id: string = '';
  public cargando: boolean = true;
  public procesando: boolean = false;
  public solicitud: any = null;
  // Lo que llego del portal web (datos_portal), ya convertido de JSON
  public datosPortal: any = null;

  // Horarios del curso con su ocupación. Los marcados quedan como reservas
  // fijas al aprobar. En los cursos con reserva automática no se marcan.
  public horarios: any[] = [];
  public reservaAutomatica: boolean = false;
  public horariosMarcados = new Set<string>();

  // Links de pago de la solicitud (el más reciente primero)
  public links: any[] = [];

  // Pestañas (en móvil van en el menú de hamburguesa)
  public pestanaActiva: string = 'solicitud';
  public menuMovilAbierto: boolean = false;

  // Aprobación: lo que pidió es el punto de partida, pero se puede escoger
  // otro curso y otras líneas de la tarifa (plan y adicionales).
  public cursos: any[] = [];
  // Los mismos cursos para el buscador (sin importar mayúsculas ni tildes)
  public cursosItems: DropdownItem[] = [];
  public idCursoElegido: string = '';
  public lineasTarifa: any[] = [];
  public lineasMarcadas = new Set<string>();
  public cargandoTarifa: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solicitudesService: SolicitudesInscripcionPublicaService,
    private linksPagoService: LinksPagoService,
    private cursosExtraService: CursosExtraService,
    private tarifasService: TarifasCursosExtraService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.cargar();
    });
  }

  cargar() {
    this.solicitudesService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;

        if (body.length === 0) {
          Swal.fire('No encontrada', 'La solicitud no existe.', 'warning').then(() => this.volver());
          return;
        }

        this.solicitud = body[0];
        this.datosPortal = this.leerDatosPortal(this.solicitud.datos_portal);
        this.titulo = 'Solicitud de ' + this.nombreEstudiante();
        this.idCursoElegido = this.solicitud.id_curso_extra;
        this.cargarHorarios();
        this.cargarLinks();
        if (this.esPendiente()) {
          this.cargarCursos();
        } else if (this.pestanaActiva === 'aprobacion' && this.solicitud.estado === 'rechazada') {
          this.pestanaActiva = 'solicitud';
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar la solicitud', error);
        Swal.fire('Error', 'No se pudo cargar la solicitud.', 'error');
      }
    });
  }

  // datos_portal llega como texto JSON; si no es valido no se muestra el bloque
  leerDatosPortal(valor: any): any {
    if (!valor) return null;
    if (typeof valor === 'object') return valor;
    try {
      return JSON.parse(valor);
    } catch {
      return null;
    }
  }

  // Cursos activos para escoger en la aprobación. La tarifa se carga cuando
  // ya se conoce el año del curso elegido.
  cargarCursos() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.cursos = (response.body || []) as any[];
        // El curso que pidió puede estar inactivo: igual se deja escoger
        if (!this.cursos.some((c: any) => c.id === this.solicitud.id_curso_extra)) {
          this.cursos.unshift({
            id: this.solicitud.id_curso_extra, nombre: this.solicitud.nombre_curso, anio: this.solicitud.anio,
            fecha_inicio: this.solicitud.fecha_inicio, fecha_fin: this.solicitud.fecha_fin
          });
        }
        this.cursosItems = this.cursos.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          descripcion: (c.id === this.solicitud.id_curso_extra ? 'El que pidió · ' : '') +
            (c.fecha_inicio ? `Del ${c.fecha_inicio} al ${c.fecha_fin}` : 'Permanente')
        }));
        this.cargarTarifa();
      },
      error: (error: any) => console.error('Error al cargar los cursos', error)
    });
  }

  get cursoElegido(): any {
    return this.cursos.find((c: any) => c.id === this.idCursoElegido) || null;
  }

  // Al cambiar el curso se recargan sus horarios y su tarifa, sin nada marcado
  cambiarCurso() {
    this.horariosMarcados = new Set<string>();
    this.cargarHorarios();
    this.cargarTarifa();
  }

  // Líneas de la tarifa vigente del curso elegido (la del convenio si la hay).
  // En el curso que pidió vienen marcados el plan y los adicionales del portal.
  cargarTarifa() {
    const curso = this.cursoElegido;
    this.lineasTarifa = [];
    this.lineasMarcadas = new Set<string>();
    if (!curso) return;

    this.cargandoTarifa = true;
    this.tarifasService.obtenerVigente(curso.id, curso.anio, this.solicitud.id_institucion_cliente).subscribe({
      next: (response: any) => {
        this.cargandoTarifa = false;
        const tarifas = (response.body || []) as any[];
        this.lineasTarifa = tarifas.length > 0 ? (tarifas[0].detalle || []) : [];
        if (curso.id === this.solicitud.id_curso_extra) {
          const pedidas = [this.solicitud.id_tarifa_curso_extra_detalle, ...this.leerIds(this.solicitud.ids_adicionales)];
          this.lineasMarcadas = new Set(
            this.lineasTarifa.filter((l: any) => pedidas.includes(l.id)).map((l: any) => l.id)
          );
        }
      },
      error: (error: any) => {
        this.cargandoTarifa = false;
        console.error('Error al cargar la tarifa', error);
      }
    });
  }

  // ids_adicionales llega como texto JSON
  private leerIds(valor: any): string[] {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    try {
      const lista = JSON.parse(valor);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  alternarLinea(linea: any) {
    if (this.lineasMarcadas.has(linea.id)) {
      this.lineasMarcadas.delete(linea.id);
    } else {
      this.lineasMarcadas.add(linea.id);
    }
  }

  get totalCobro(): number {
    return this.lineasTarifa
      .filter((l: any) => this.lineasMarcadas.has(l.id))
      .reduce((suma: number, l: any) => suma + Number(l.valor || 0), 0);
  }

  textoTipoLinea(linea: any): string {
    const tipos: any = { matricula: 'Matrícula', pension: 'Pensión', paquete: 'Paquete', unico: 'Pago único' };
    const tipo = tipos[linea.tipo] || '';
    return linea.tipo === 'paquete' && linea.numero_sesiones ? `${tipo} · ${linea.numero_sesiones} sesiones` : tipo;
  }

  correoDestino(): string {
    return this.solicitud?.acu_correo || this.solicitud?.est_correo || '';
  }

  // El bloque del acudiente solo aplica cuando quien inscribe es otra
  // persona (participante menor de edad)
  tieneAcudiente(): boolean {
    return !!(this.solicitud?.acu_numero_identificacion || this.solicitud?.acu_primer_nombre);
  }

  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  etiquetaPestana(pestana: string): string {
    const etiquetas: any = { solicitud: 'Solicitud', participante: 'Participante', aprobacion: 'Aprobación', pago: 'Pago' };
    return etiquetas[pestana] || '';
  }

  iconoPestana(pestana: string): string {
    const iconos: any = { solicitud: 'fa-file-alt', participante: 'fa-user', aprobacion: 'fa-check-circle', pago: 'fa-credit-card' };
    return iconos[pestana] || '';
  }

  // La de aprobación no aplica a una rechazada; la de pago, solo si hay link
  get pestanas(): string[] {
    const lista = ['solicitud', 'participante'];
    if (this.solicitud && this.solicitud.estado !== 'rechazada') lista.push('aprobacion');
    if (this.linkActual) lista.push('pago');
    return lista;
  }

  cargarHorarios() {
    // Pendiente: los del curso elegido en la aprobación. Ya aprobada, el back
    // devuelve los del curso en el que quedó inscrito.
    const idCurso = this.esPendiente() && this.idCursoElegido !== this.solicitud.id_curso_extra ? this.idCursoElegido : undefined;
    this.solicitudesService.obtenerHorarios(this.id, idCurso).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.reservaAutomatica = !!body.reserva_automatica;
        this.horarios = body.horarios || [];
        // Pendiente: vienen marcados los que escogió y tienen cupo (solo en
        // el curso que pidió). Ya resuelta: se muestran los que quedaron asignados.
        const cursoPedido = this.idCursoElegido === this.solicitud.id_curso_extra;
        this.horariosMarcados = new Set(
          this.horarios
            .filter((h: any) => this.esPendiente() ? (cursoPedido && h.preferido && !h.lleno) : h.asignado)
            .map((h: any) => h.id)
        );
      },
      error: (error: any) => console.error('Error al cargar los horarios', error)
    });
  }

  cargarLinks() {
    this.linksPagoService.obtenerPorSolicitud(this.id).subscribe({
      next: (response: any) => this.links = response.body || [],
      error: (error: any) => console.error('Error al cargar el link de pago', error)
    });
  }

  get linkActual(): any {
    return this.links.length > 0 ? this.links[0] : null;
  }

  // Un horario lleno no se puede marcar (sí desmarcar)
  alternarHorario(h: any) {
    if (!this.esPendiente() || this.reservaAutomatica) return;
    if (this.horariosMarcados.has(h.id)) {
      this.horariosMarcados.delete(h.id);
    } else if (!h.lleno) {
      this.horariosMarcados.add(h.id);
    }
  }

  textoHorario(h: any): string {
    return `${h.nombre_dia} ${String(h.hora_inicial).substring(0, 5)} - ${String(h.hora_final).substring(0, 5)}`;
  }

  textoOcupacion(h: any): string {
    return h.cupo !== null && h.cupo !== undefined ? `${h.ocupados} de ${h.cupo}` : `${h.ocupados} · sin límite`;
  }

  etiquetaEstadoLink(link: any): string {
    const etiquetas: any = { pendiente: 'Pendiente', activo: 'Esperando el pago', pagado: 'Pagado', error: 'No se creó' };
    return etiquetas[link.estado] || link.estado;
  }

  generarLink() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.generar(this.linkActual.id).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.avisarLink(respuesta, 'Link de pago');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo crear el link.', 'error');
      }
    });
  }

  reenviarCorreo() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.reenviarCorreo(this.linkActual.id).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Correo enviado', `Se le envió el link de pago a ${this.linkActual.correo_destino}.`, 'success');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('No salió el correo', error?.error?.error || 'No se pudo enviar el correo.', 'error');
        this.cargarLinks();
      }
    });
  }

  // Por si el aviso de Bold no llegó: consulta el link y registra el pago
  verificarPago() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.verificar(this.linkActual.id).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        Swal.fire(respuesta.estado === 'pagado' ? 'Pagado' : 'Sin pago todavía', respuesta.mensaje || '',
          respuesta.estado === 'pagado' ? 'success' : 'info');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo consultar Bold.', 'error');
      }
    });
  }

  copiarLink() {
    if (!this.linkActual?.url) return;
    navigator.clipboard?.writeText(this.linkActual.url).then(
      () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Link copiado', showConfirmButton: false, timer: 1800 }),
      () => Swal.fire('Link de pago', this.linkActual.url, 'info')
    );
  }

  private avisarLink(link: any, titulo: string) {
    if (!link) return;
    if (link.estado === 'activo' && link.correo_enviado) {
      Swal.fire(titulo, 'Se creó el link y se le envió el correo con el botón de pago.', 'success');
    } else if (link.estado === 'activo') {
      Swal.fire(titulo, 'Se creó el link, pero no salió el correo: ' + (link.error_correo || '') + '. Puedes reenviarlo o copiar el link.', 'warning');
    } else {
      Swal.fire(titulo, 'No se pudo crear el link en Bold: ' + (link.error || '') + '. Puedes reintentarlo desde la solicitud.', 'warning');
    }
  }

  nombreEstudiante(): string {
    if (!this.solicitud) return '';
    return [
      this.solicitud.est_primer_nombre,
      this.solicitud.est_segundo_nombre,
      this.solicitud.est_primer_apellido,
      this.solicitud.est_segundo_apellido
    ].filter(Boolean).join(' ');
  }

  nombreAcudiente(): string {
    if (!this.solicitud) return '';
    return [this.solicitud.acu_primer_nombre, this.solicitud.acu_primer_apellido]
      .filter(Boolean).join(' ');
  }

  esPendiente(): boolean {
    return this.solicitud && this.solicitud.estado === 'pendiente';
  }

  etiquetaEstado(): string {
    if (!this.solicitud) return '';
    if (this.solicitud.estado === 'aprobada') return 'Aprobada';
    if (this.solicitud.estado === 'rechazada') return 'Rechazada';
    return 'Pendiente';
  }

  /**
   * Aprobar crea la persona, el estudiante, el acudiente y la inscripción en
   * el curso elegido, las reservas fijas de los horarios marcados y, si se
   * marcó algo de la tarifa, las cuentas por cobrar y el link de pago.
   */
  async aprobar() {
    const curso = this.cursoElegido;
    if (!curso) {
      Swal.fire('Falta el curso', 'Escoge el curso en la pestaña Aprobación.', 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    const marcados = this.horarios.filter((h: any) => this.horariosMarcados.has(h.id));
    const textoHorarios = this.reservaAutomatica || this.horarios.length === 0 ? ''
      : marcados.length > 0
        ? `Queda con reserva fija en <b>${marcados.map((h: any) => this.textoHorario(h)).join(', ')}</b>.<br><br>`
        : `No marcaste ningún horario, así que queda inscrito sin reserva fija.<br><br>`;
    const valor = this.totalCobro.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const textoCobro = this.lineasMarcadas.size > 0
      ? `Se crean las cuentas por cobrar por <b>${valor}</b> y se envía el link de pago de Bold` +
        (this.correoDestino() ? ` a <b>${this.correoDestino()}</b>.` : `, pero la solicitud no tiene correo.`)
      : `No marcaste nada para cobrar, así que no se crean cuentas por cobrar ni link de pago.`;
    const result = await Swal.fire({
      title: '¿Aprobar la solicitud?',
      html: `Se va a crear el estudiante <b>${this.nombreEstudiante()}</b> y se inscribirá a ` +
            `<b>${curso.nombre}</b>.<br><br>` + textoHorarios + textoCobro,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    // Siempre se mandan las listas (aunque vayan vacías) para que el back use
    // lo escogido aquí y no lo que traía la solicitud
    const idsHorarios = this.reservaAutomatica ? [] : Array.from(this.horariosMarcados);
    this.solicitudesService.aprobar(this.id, idsHorarios, this.idCursoElegido, Array.from(this.lineasMarcadas)).subscribe({
      next: (response: any) => {
        this.procesando = false;
        if (response.lineas_no_encontradas > 0) {
          Swal.fire('Aprobada', 'Parte de lo que marcaste ya no está en la tarifa del curso y no se cobró. ' +
            'Revisa las cuentas en la inscripción del estudiante.', 'warning');
        } else if (response.link_pago) {
          this.avisarLink(response.link_pago, 'Aprobada');
        } else {
          Swal.fire('Aprobada', response.mensaje || 'El estudiante quedó inscrito.', 'success');
        }
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al aprobar la solicitud', error);
        // El back responde 400 con el motivo: cupo lleno, ya resuelta, etc.
        const mensaje = error?.error?.error || 'No se pudo aprobar la solicitud.';
        Swal.fire('No se pudo aprobar', mensaje, 'error');
      }
    });
  }

  async rechazar() {
    const result = await Swal.fire({
      title: 'Rechazar la solicitud',
      input: 'textarea',
      inputLabel: 'Motivo (opcional)',
      inputPlaceholder: 'Por qué se rechaza...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    this.solicitudesService.rechazar(this.id, result.value || null).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Rechazada', 'La solicitud quedó rechazada.', 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al rechazar la solicitud', error);
        const mensaje = error?.error?.error || 'No se pudo rechazar la solicitud.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  // Lleva a la vista 360 del estudiante creado
  irAInscripcion() {
    if (!this.solicitud?.id_estudiante_creado) {
      return;
    }
    this.router.navigate(['/estudiantes/vista/' + this.solicitud.id_estudiante_creado]);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}