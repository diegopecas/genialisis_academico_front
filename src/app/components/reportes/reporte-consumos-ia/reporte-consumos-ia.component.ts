import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { IaConsumosService } from '../../../services/ia-consumos.service';

/**
 * Reporte de consumo de IA (tabla ia_consumos).
 * Cada fila es una petición a la IA. Si la cadena de proveedores tuvo que
 * probar más de uno (p.ej. la llave gratis respondió 503 y entró la paga),
 * el detalle se ve con la acción "Ver intentos".
 */
@Component({
  selector: 'app-reporte-consumos-ia',
  templateUrl: './reporte-consumos-ia.component.html',
  styleUrl: './reporte-consumos-ia.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteConsumosIaComponent implements OnInit {
  titulo = 'Consumos de IA';

  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [
    'Servicio',
    'Acción',
    'Usuario',
    'Resultado',
    'Proveedor',
    'Modelo',
  ];

  public acciones = [
    { id: 'ver-intentos', label: 'Ver intentos', icono: '/assets/images/ver-intentos-ia.png' },
  ];

  // Rango consultado al backend. Por defecto, el mes en curso.
  public fechaInicio = '';
  public fechaFin = '';

  // Resumen del pie, calculado sobre lo que la tabla deja después de filtrar.
  public totalLlamadas = 0;
  public totalExitosas = 0;
  public totalFallidas = 0;
  public totalConRespaldo = 0;
  public totalTokens = 0;
  public totalTokensTexto = '0';

  public cargando = false;

  // Nombres legibles de los servicios que registra el backend
  private nombresServicio: { [clave: string]: string } = {
    maquina_actividades: 'Máquina de actividades',
    chat: 'Chat',
    mejorar_texto: 'Mejorar texto',
    cobertura_curricular: 'Cobertura curricular',
    mensajes: 'Mensaje personalizado',
    medidas: 'Medidas',
    pagos: 'Pagos',
    estudiantes: 'Estudiantes',
    autoregistro: 'Autoregistro',
    transcripcion: 'Transcripción de audio',
    gini: 'Gini',
    vision: 'Visión',
  };

  constructor(private iaConsumosService: IaConsumosService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaInicio = this.formatoIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.fechaFin = this.formatoIso(hoy);
    this.crearTitulos();
    this.consultar();
  }

  consultar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire('Fechas incompletas', 'Selecciona la fecha inicial y la final', 'warning');
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargando = true;
    this.iaConsumosService.obtenerReporte(this.fechaInicio, this.fechaFin).subscribe({
      next: (response: any) => {
        const body = (response.body || []) as any[];
        this.datos = body.map((item: any) => ({
          ...item,
          fecha_texto: this.formatearFechaHora(item.fecha),
          servicio_texto: this.nombresServicio[item.servicio] || item.servicio,
          accion_texto: item.accion ? String(item.accion).replace(/_/g, ' ') : '',
          usuario_texto: item.nombre_persona || (item.id_persona ? 'Sin nombre' : 'Sin usuario'),
          resultado_texto: item.exito ? 'Exitosa' : 'Fallida',
          proveedor_texto: item.proveedor || '',
          modelo_texto: item.modelo || '',
          tokens_entrada_texto: this.numeroOVacio(item.tokens_entrada),
          tokens_salida_texto: this.numeroOVacio(item.tokens_salida),
          tokens_total_texto: this.numeroOVacio(item.tokens_total),
          tiempo_texto: this.formatearTiempo(item.tiempo_ms),
          error_texto: item.error || '',
          // Fila resaltada cuando ningún proveedor respondió, y en amarillo
          // cuando respondió pero después de fallar alguno de la cadena.
          color: !item.exito ? '#ffe3e3' : (item.cantidad_intentos > 1 ? '#fff4d6' : ''),
        }));
        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
      error: () => {
        // El mensaje del backend lo muestra el interceptor
        this.datos = [];
        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
    });
  }

  crearTitulos(): void {
    this.titulos = [
      { clave: 'fecha_texto', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'servicio_texto', alias: 'Servicio', alinear: 'izquierda' },
      { clave: 'accion_texto', alias: 'Acción', alinear: 'izquierda' },
      { clave: 'usuario_texto', alias: 'Usuario', alinear: 'izquierda' },
      { clave: 'resultado_texto', alias: 'Resultado', alinear: 'centrado' },
      { clave: 'proveedor_texto', alias: 'Proveedor', alinear: 'centrado' },
      { clave: 'modelo_texto', alias: 'Modelo', alinear: 'izquierda' },
      { clave: 'tokens_entrada_texto', alias: 'Tokens entrada', alinear: 'centrado' },
      { clave: 'tokens_salida_texto', alias: 'Tokens salida', alinear: 'centrado' },
      { clave: 'tokens_total_texto', alias: 'Tokens total', alinear: 'centrado' },
      { clave: 'tiempo_texto', alias: 'Tiempo', alinear: 'centrado' },
      { clave: 'cantidad_intentos', alias: 'Intentos', alinear: 'centrado' },
      { clave: 'error_texto', alias: 'Error', alinear: 'izquierda' },
    ];
  }

  /**
   * El resumen del pie sigue lo que muestra la tabla: se recalcula cada vez que
   * cambian los filtros, no solo al cargar.
   */
  actualizarResumen(filas: any[]): void {
    const datos = filas || [];
    this.totalLlamadas = datos.length;
    this.totalExitosas = datos.filter((d) => d.exito).length;
    this.totalFallidas = this.totalLlamadas - this.totalExitosas;
    this.totalConRespaldo = datos.filter((d) => d.exito && d.cantidad_intentos > 1).length;
    this.totalTokens = datos.reduce((suma, d) => suma + (Number(d.tokens_total) || 0), 0);
    this.totalTokensTexto = this.totalTokens.toLocaleString('es-CO');
  }

  clicAccion($event: any): void {
    if ($event.accion === 'ver-intentos') {
      this.verIntentos($event.registro);
    }
  }

  /**
   * Muestra cada proveedor que se probó en la cadena, en orden, con su resultado.
   */
  verIntentos(registro: any): void {
    const intentos: any[] = Array.isArray(registro?.intentos) ? registro.intentos : [];

    if (intentos.length === 0) {
      Swal.fire('Sin intentos', 'No se llegó a llamar a ningún proveedor (no había cadena o llaves configuradas).', 'info');
      return;
    }

    const filas = intentos.map((intento: any, indice: number) => `
      <div class="intento-ia ${intento.exito ? 'ok' : 'fallo'}">
        <div class="intento-ia-cabecera">
          <strong>${indice + 1}. ${this.escapar(intento.proveedor)}</strong>
          <span>${intento.exito ? 'Respondió' : 'Falló'}</span>
        </div>
        <div>Modelo: ${this.escapar(intento.modelo)}</div>
        <div>HTTP: ${intento.http ?? '—'} · Tiempo: ${this.formatearTiempo(intento.ms)}</div>
        ${intento.tokens ? `<div>Tokens: ${this.numeroOVacio(intento.tokens.total)}</div>` : ''}
        ${intento.error ? `<div class="intento-ia-error">${this.escapar(intento.error)}</div>` : ''}
      </div>
    `).join('');

    Swal.fire({
      title: 'Intentos de la llamada',
      html: `<div class="intentos-ia">${filas}</div>`,
      width: 600,
      confirmButtonText: 'Cerrar',
    });
  }

  private escapar(texto: any): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private numeroOVacio(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '';
    }
    return Number(valor).toLocaleString('es-CO');
  }

  private formatearTiempo(ms: any): string {
    const valor = Number(ms) || 0;
    if (valor < 1000) {
      return `${valor} ms`;
    }
    return `${(valor / 1000).toFixed(1)} s`;
  }

  private formatearFechaHora(fecha: string): string {
    if (!fecha) return '';
    const [dia, hora] = fecha.split(' ');
    const [year, month, day] = dia.split('-').map(Number);
    if (!year) return fecha;
    const fechaTexto = new Date(year, month - 1, day).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return hora ? `${fechaTexto} ${hora.substring(0, 5)}` : fechaTexto;
  }

  private formatoIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
