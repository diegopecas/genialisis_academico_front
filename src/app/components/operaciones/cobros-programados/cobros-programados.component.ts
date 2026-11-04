// ========== cobros-programados.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { LinksPagoService } from '../../../services/links-pago.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado)
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

/**
 * Cobros programados: las cuentas por cobrar de los estudiantes con su estado
 * de cobro. Si el cobro automático está prendido (configuración global), cada
 * día sale solo el correo con el link de pago de las cuentas que vencen en
 * los próximos días; desde aquí se ve qué salió y se puede enviar, reenviar o
 * copiar el link a mano. Se basa en el formulario de Recordatorio de pagos.
 */
@Component({
  selector: 'app-cobros-programados',
  templateUrl: './cobros-programados.component.html',
  styleUrl: './cobros-programados.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class CobrosProgramadosComponent implements OnInit {

  public titulo = 'Cobros Programados';
  public cargando: boolean = true;
  public procesando: boolean = false;

  // Parámetros del cobro automático (configuración global)
  public activo: boolean = false;
  public diasAntes: number | null = null;

  // Abre en los próximos días: es lo que va a salir solo
  public filtro: string = 'proximos';
  public filtros = [
    { clave: 'proximos', texto: 'Próximos' },
    { clave: 'vencidas', texto: 'Vencidas' },
    { clave: 'todas', texto: 'Todas' }
  ];

  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];
  public columnasFiltro = ['Estudiante', 'Estado'];

  constructor(
    private router: Router,
    private linksPagoService: LinksPagoService
  ) { }

  ngOnInit(): void {
    this.definirTabla();
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.linksPagoService.obtenerCobrosProgramados(this.filtro).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.cargando = false;
        this.activo = !!body.activo;
        this.diasAntes = body.dias_antes ?? null;
        this.datos = ((body.filas || []) as any[]).map((f: any) => ({
          ...f,
          id: f.id_cuenta,
          estudiante: (f.estudiante || '').replace(/\s+/g, ' ').trim(),
          correo_mostrar: f.correo_destino || 'Sin correo',
          estado_mostrar: this.etiquetaEstado(f),
          // Pastel por estado: verde pagado o enviado, rosado con problema
          color: f.estado_cobro === 'pagado' ? '#eaf6e6'
            : f.estado_cobro === 'enviado' ? '#f3f9ef'
            : ['error', 'error_correo', 'sin_correo', 'vencida'].includes(f.estado_cobro) ? '#fcebea' : ''
        }));
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar los cobros programados', error);
        Swal.fire('Error', error?.error?.error || 'No se pudieron cargar los cobros.', 'error');
      }
    });
  }

  seleccionarFiltro(clave: string) {
    if (this.filtro === clave) return;
    this.filtro = clave;
    this.cargar();
  }

  etiquetaEstado(f: any): string {
    switch (f.estado_cobro) {
      case 'pagado': return 'Pagado';
      case 'enviado': return 'Enviado el ' + String(f.fecha_correo || '').substring(0, 10);
      case 'error': return 'No se creó el link';
      case 'error_correo': return 'No salió el correo';
      case 'sin_correo': return 'Sin correo';
      case 'vencida': return 'Vencida sin cobrar';
      case 'mora': return 'Mora: se envía a mano';
      case 'por_enviar': return this.activo ? 'Sale en el próximo cobro automático' : 'Sin enviar';
      case 'programado': return this.activo ? 'Sale el ' + f.fecha_envio : 'Sin enviar';
      default: return f.estado_cobro || '';
    }
  }

  // ===== Resumen =====

  get porEnviar(): number {
    return this.datos.filter(f => f.puede_enviar === 1).length;
  }

  get enviados(): number {
    return this.datos.filter(f => f.estado_cobro === 'enviado').length;
  }

  get sinCorreo(): number {
    return this.datos.filter(f => f.estado_cobro === 'sin_correo').length;
  }

  get vencidas(): number {
    return this.datos.filter(f => f.saldo > 0 && f.fecha < this.hoyISO()).length;
  }

  get totalSaldo(): number {
    return this.datos.reduce((suma, f) => suma + Number(f.saldo || 0), 0);
  }

  private hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ===== Acciones =====

  clicAccion($event: any) {
    const fila = $event.registro;
    switch ($event.accion) {
      case 'enviar':
        this.enviar(fila);
        break;
      case 'reenviar':
        this.reenviar(fila);
        break;
      case 'reintentar':
        this.reintentar(fila);
        break;
      case 'copiar':
        this.copiar(fila);
        break;
      case 'estudiante':
        this.router.navigate(['/estudiantes/vista/' + fila.id_estudiante]);
        break;
    }
  }

  async enviar(fila: any) {
    const valor = Number(fila.saldo || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const result = await Swal.fire({
      title: '¿Enviar el cobro?',
      html: `Se le envía a <b>${fila.correo_destino}</b> el correo con el link de pago (o las cuentas para transferir) ` +
        `de <b>${fila.detalle}</b> por <b>${valor}</b>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;
    this.procesando = true;
    this.linksPagoService.enviarCobro(fila.id_cuenta).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.avisarResultado(respuesta);
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('No se envió', error?.error?.error || 'No se pudo enviar el cobro.', 'error');
        this.cargar();
      }
    });
  }

  reenviar(fila: any) {
    this.procesando = true;
    this.linksPagoService.reenviarCorreo(fila.id_link).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Correo enviado', `Se le reenvió el cobro a ${fila.correo_destino}.`, 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('No salió el correo', error?.error?.error || 'No se pudo enviar el correo.', 'error');
        this.cargar();
      }
    });
  }

  // El link quedó pendiente o con error en la pasarela: se crea otra vez y sale el correo
  reintentar(fila: any) {
    this.procesando = true;
    this.linksPagoService.generar(fila.id_link).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.avisarResultado(respuesta);
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo crear el link.', 'error');
      }
    });
  }

  copiar(fila: any) {
    if (!fila.url) return;
    navigator.clipboard?.writeText(fila.url).then(
      () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Link copiado', showConfirmButton: false, timer: 1800 }),
      () => Swal.fire('Link de pago', fila.url, 'info')
    );
  }

  private avisarResultado(link: any) {
    if (!link) return;
    if (link.correo_enviado) {
      Swal.fire('Cobro enviado', link.proveedor === 'transferencia'
        ? 'Se le envió el correo con lo que va a pagar y las cuentas para transferir.'
        : 'Se creó el link y se le envió el correo con el botón de pago.', 'success');
    } else if (link.estado === 'activo') {
      Swal.fire('Cobro creado', 'No salió el correo: ' + (link.error_correo || '') + '. Puedes reenviarlo o copiar el link.', 'warning');
    } else {
      Swal.fire('Cobro creado', 'No se pudo crear el link en la pasarela: ' + (link.error || '') + '. Puedes intentarlo otra vez.', 'warning');
    }
  }

  definirTabla() {
    // Estudiante, detalle y estado primero: es lo que se ve en las tarjetas del celular
    this.titulos = [
      { clave: 'estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'detalle', alias: 'Cuenta', alinear: 'izquierda' },
      { clave: 'estado_mostrar', alias: 'Estado', alinear: 'centrado' },
      { clave: 'fecha', alias: 'Vence', alinear: 'centrado' },
      { clave: 'saldo', alias: 'Saldo', alinear: 'derecha', tipo: 'money' },
      { clave: 'correo_mostrar', alias: 'Correo', alinear: 'izquierda' }
    ];
    this.acciones = [
      { id: 'enviar', label: 'Enviar el cobro ahora', condicion: 'puede_enviar', valor: 1 },
      { id: 'reenviar', label: 'Reenviar el correo', condicion: 'puede_reenviar', valor: 1 },
      { id: 'reintentar', label: 'Crear el link otra vez', condicion: 'puede_reintentar', valor: 1 },
      { id: 'copiar', label: 'Copiar el link', condicion: 'puede_copiar', valor: 1 },
      { id: 'estudiante', label: 'Ver estudiante' }
    ];
  }
}
