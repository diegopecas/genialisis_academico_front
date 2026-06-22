import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { RegistrosAsistenciaColaboradoresService } from '../../../services/registros-asistencia-colaboradores.service';
import { HorariosColaboradoresService } from '../../../services/horarios-colaboradores.service';
import Swal from 'sweetalert2';
import * as L from 'leaflet';

@Component({
  selector: 'app-registro-ingreso-salida',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './registro-ingreso-salida.component.html',
  styleUrl: './registro-ingreso-salida.component.scss',
})
export class RegistroIngresoSalidaComponent implements OnInit, OnDestroy {
  @Input() modoEmbebido = false;

  public titulo = 'Registro Ingreso / Salida';
  public usuario: any = null;
  public idColaborador = 0;
  public nombreColaborador = '';

  public latitudActual: number | null = null;
  public longitudActual: number | null = null;
  public obteniendoUbicacion = false;
  public errorUbicacion = '';
  public distanciaActual: number | null = null;
  public dentroRango = false;

  public config: any = { tolerancia_minutos: 15 };
  public poligonoGeofence: number[][] = [];

  public tiposRegistro: any[] = [];
  public estadosRegistro: any[] = [];
  public registrosHoy: any[] = [];
  public horarioHoy: any = null;

  public cargando = true;
  public registrando = false;

  public horaActual = '';
  public fechaActual = '';
  private intervalReloj: any;

  public validaJornada = true;
  public validaDescanso = false;

  // Mini mapa
  public miniMapa: L.Map | null = null;
  public marcadorUbicacion: L.CircleMarker | null = null;
  public mostrarMapa = false;

  // Huella del dispositivo
  private huellaDispositivo = '';
  private userAgent = '';

  constructor(
    private router: Router,
    private registrosService: RegistrosAsistenciaColaboradoresService,
    private horariosService: HorariosColaboradoresService
  ) {}

  ngOnInit() {
    this.cargarUsuario();
    this.generarHuellaDispositivo();
    if (!!this.idColaborador) {
      this.iniciarReloj();
      this.cargarDatosIniciales();
    }
  }

  ngOnDestroy() {
    if (this.intervalReloj) clearInterval(this.intervalReloj);
    if (this.miniMapa) { this.miniMapa.remove(); this.miniMapa = null; }
  }

  cargarUsuario() {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      this.usuario = JSON.parse(usuarioStr);
      this.idColaborador = this.usuario.id_colaborador || 0;
      this.nombreColaborador = [this.usuario.primer_nombre, this.usuario.primer_apellido].filter(Boolean).join(' ');
      this.validaJornada = this.usuario.valida_ingreso_jornada == 1 || this.usuario.valida_ingreso_jornada == null;
      this.validaDescanso = this.usuario.valida_ingreso_descanso == 1;
    }
    if (!this.idColaborador) {
      Swal.fire({ icon: 'warning', title: 'Sin acceso', text: 'No se encontró un colaborador asociado a tu usuario' });
      this.router.navigate(['/menu']);
    }
  }

  iniciarReloj() {
    this.actualizarReloj();
    this.intervalReloj = setInterval(() => this.actualizarReloj(), 1000);
  }

  actualizarReloj() {
    const ahora = new Date();
    this.horaActual = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.fechaActual = ahora.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  cargarDatosIniciales() {
    this.cargando = true;
    let pendientes = 4;
    const verificar = () => { pendientes--; if (pendientes <= 0) { this.cargando = false; this.obtenerUbicacion(); } };

    this.registrosService.obtenerConfiguracionGeofence().subscribe({
      next: (r: any) => {
        const c = r.body || {};
        this.config.tolerancia_minutos = c['asistencia_tolerancia_minutos'] || 15;
        if (c['asistencia_geofence_poligono']) {
          try {
            this.poligonoGeofence = JSON.parse(c['asistencia_geofence_poligono']);
          } catch (e) { this.poligonoGeofence = []; }
        }
        verificar();
      },
      error: () => verificar(),
    });

    this.registrosService.obtenerTiposRegistro().subscribe({
      next: (r: any) => { this.tiposRegistro = r.body || []; verificar(); },
      error: () => verificar(),
    });

    this.registrosService.obtenerEstadosRegistro().subscribe({
      next: (r: any) => { this.estadosRegistro = r.body || []; verificar(); },
      error: () => verificar(),
    });

    this.cargarRegistrosHoy(verificar);
    this.cargarHorarioHoy();
  }

  cargarRegistrosHoy(callback?: () => void) {
    this.registrosService.obtenerRegistrosHoy(this.idColaborador).subscribe({
      next: (r: any) => { this.registrosHoy = r.body || []; if (callback) callback(); },
      error: () => { if (callback) callback(); },
    });
  }

  cargarHorarioHoy() {
    const diaSemana = new Date().getDay();
    const diaISO = diaSemana === 0 ? 7 : diaSemana;
    this.horariosService.obtenerPorColaborador(this.idColaborador).subscribe({
      next: (r: any) => {
        const horarios = r.body || [];
        this.horarioHoy = horarios.find((h: any) => h.dia_semana == diaISO && h.activo == 1) || null;
      },
      error: () => {},
    });
  }

  obtenerUbicacion() {
    if (!navigator.geolocation) { this.errorUbicacion = 'Tu navegador no soporta geolocalización'; return; }
    this.obteniendoUbicacion = true;
    this.errorUbicacion = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.latitudActual = position.coords.latitude;
        this.longitudActual = position.coords.longitude;
        this.obteniendoUbicacion = false;
        this.verificarUbicacion();
        this.inicializarMiniMapa();
      },
      (error) => {
        this.obteniendoUbicacion = false;
        switch (error.code) {
          case error.PERMISSION_DENIED: this.errorUbicacion = 'Permiso de ubicación denegado. Actívalo en la configuración del navegador.'; break;
          case error.POSITION_UNAVAILABLE: this.errorUbicacion = 'Ubicación no disponible'; break;
          case error.TIMEOUT: this.errorUbicacion = 'Tiempo de espera agotado al obtener ubicación'; break;
          default: this.errorUbicacion = 'Error al obtener ubicación';
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  verificarUbicacion() {
    if (this.latitudActual == null || this.longitudActual == null) return;
    if (this.poligonoGeofence.length >= 3) {
      this.dentroRango = this.puntoEnPoligono(this.latitudActual, this.longitudActual, this.poligonoGeofence);
    } else {
      this.dentroRango = true;
    }
  }

  puntoEnPoligono(lat: number, lng: number, poligono: number[][]): boolean {
    let dentro = false;
    const n = poligono.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = poligono[i][0], yi = poligono[i][1];
      const xj = poligono[j][0], yj = poligono[j][1];
      const intersecta = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersecta) dentro = !dentro;
    }
    return dentro;
  }

  // === MINI MAPA ===

  inicializarMiniMapa() {
    if (this.latitudActual == null || this.longitudActual == null) return;
    this.mostrarMapa = true;

    setTimeout(() => {
      if (this.miniMapa) { this.miniMapa.remove(); this.miniMapa = null; }

      this.miniMapa = L.map('mini-mapa-checkin', {
        center: [this.latitudActual!, this.longitudActual!],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.miniMapa);

      // Polígono de la zona
      if (this.poligonoGeofence.length >= 3) {
        const latlngs: L.LatLngExpression[] = this.poligonoGeofence.map(p => [p[0], p[1]] as L.LatLngExpression);
        L.polygon(latlngs, { color: '#d4af37', weight: 3, fillOpacity: 0.15, fillColor: '#d4af37' }).addTo(this.miniMapa);
      }

      // Marcador de ubicación actual (punto azul)
      this.marcadorUbicacion = L.circleMarker([this.latitudActual!, this.longitudActual!], {
        radius: 8, color: '#fff', weight: 3, fillColor: this.dentroRango ? '#2196F3' : '#f44336', fillOpacity: 1,
      }).addTo(this.miniMapa).bindPopup(this.dentroRango ? 'Estás dentro de la zona' : 'Estás fuera de la zona');

      // Ajustar vista para mostrar polígono + ubicación
      if (this.poligonoGeofence.length >= 3) {
        const bounds = L.latLngBounds(this.poligonoGeofence.map(p => [p[0], p[1]] as L.LatLngTuple));
        bounds.extend([this.latitudActual!, this.longitudActual!]);
        this.miniMapa.fitBounds(bounds, { padding: [30, 30] });
      }

      setTimeout(() => this.miniMapa?.invalidateSize(), 300);
    }, 200);
  }

  toggleMapa() {
    this.mostrarMapa = !this.mostrarMapa;
    if (this.mostrarMapa && this.latitudActual != null) {
      setTimeout(() => {
        if (!this.miniMapa) { this.inicializarMiniMapa(); }
        else { this.miniMapa.invalidateSize(); }
      }, 200);
    }
  }

  // === LÓGICA DE SIGUIENTE PASO ===

  obtenerSiguientePaso(): any | null {
    if (this.registrosHoy.length === 0) {
      if (this.validaJornada) return this.tiposRegistro.find((t: any) => t.codigo === 'jornada_entrada') || null;
      if (this.validaDescanso) return this.tiposRegistro.find((t: any) => t.codigo === 'descanso_salida') || null;
      return this.tiposRegistro.length > 0 ? this.tiposRegistro[0] : null;
    }

    const ultimo = this.registrosHoy[this.registrosHoy.length - 1];
    const codigoUltimo = ultimo.codigo_tipo;

    if (codigoUltimo === 'jornada_entrada') {
      if (this.validaDescanso) return this.tiposRegistro.find((t: any) => t.codigo === 'descanso_salida') || null;
      return this.tiposRegistro.find((t: any) => t.codigo === 'jornada_salida') || null;
    }
    if (codigoUltimo === 'descanso_salida') return this.tiposRegistro.find((t: any) => t.codigo === 'descanso_regreso') || null;
    if (codigoUltimo === 'descanso_regreso') return this.tiposRegistro.find((t: any) => t.codigo === 'jornada_salida') || null;
    if (codigoUltimo === 'jornada_salida') return this.tiposRegistro.find((t: any) => t.codigo === 'jornada_entrada') || null;

    return this.tiposRegistro.length > 0 ? this.tiposRegistro[0] : null;
  }

  puedesSaltarDescanso(): boolean {
    const siguiente = this.obtenerSiguientePaso();
    if (!siguiente) return false;
    return (siguiente.codigo === 'descanso_salida' || siguiente.codigo === 'descanso_regreso');
  }

  obtenerTipoSalidaJornada(): any | null {
    return this.tiposRegistro.find((t: any) => t.codigo === 'jornada_salida') || null;
  }

  // === DETERMINAR ESTADO ===

  determinarEstado(tipoRegistro: any): any | null {
    if (!this.horarioHoy) return this.estadosRegistro.find((e: any) => e.codigo === 'normal') || null;

    const ahora = new Date();
    const horaActualMin = ahora.getHours() * 60 + ahora.getMinutes();

    if (tipoRegistro.codigo === 'jornada_entrada') {
      const [h, m] = this.horarioHoy.hora_entrada.substring(0, 5).split(':').map(Number);
      const horaEsperada = h * 60 + m;
      if (horaActualMin < horaEsperada - 30) return this.estadosRegistro.find((e: any) => e.codigo === 'entrada_anticipada') || null;
      if (horaActualMin <= horaEsperada + this.config.tolerancia_minutos) return this.estadosRegistro.find((e: any) => e.codigo === 'a_tiempo') || null;
      return this.estadosRegistro.find((e: any) => e.codigo === 'tarde') || null;
    }

    if (tipoRegistro.codigo === 'jornada_salida') {
      const [h, m] = this.horarioHoy.hora_salida.substring(0, 5).split(':').map(Number);
      const horaEsperada = h * 60 + m;
      if (horaActualMin < horaEsperada - this.config.tolerancia_minutos) return this.estadosRegistro.find((e: any) => e.codigo === 'salida_anticipada') || null;
      return this.estadosRegistro.find((e: any) => e.codigo === 'normal') || null;
    }

    if (tipoRegistro.codigo === 'descanso_regreso' && this.horarioHoy.hora_fin_descanso) {
      const [h, m] = this.horarioHoy.hora_fin_descanso.substring(0, 5).split(':').map(Number);
      const horaEsperada = h * 60 + m;
      if (horaActualMin <= horaEsperada + this.config.tolerancia_minutos) return this.estadosRegistro.find((e: any) => e.codigo === 'a_tiempo') || null;
      return this.estadosRegistro.find((e: any) => e.codigo === 'tarde') || null;
    }

    return this.estadosRegistro.find((e: any) => e.codigo === 'normal') || null;
  }

  // === REGISTRAR ===

  registrar(tipoRegistro: any) {
    if (!this.dentroRango) {
      Swal.fire({ icon: 'error', title: 'Fuera de la zona', text: 'No te encuentras dentro de la zona autorizada para registrar asistencia.' });
      return;
    }

    const estado = this.determinarEstado(tipoRegistro);
    this.registrando = true;

    this.registrosService.registrar({
      id_colaborador: this.idColaborador,
      id_tipo_registro: tipoRegistro.id,
      latitud: this.latitudActual,
      longitud: this.longitudActual,
      distancia_metros: null,
      dentro_rango: this.dentroRango ? 1 : 0,
      id_estado: estado ? estado.id : null,
      registro_manual: 0,
      user_agent: this.userAgent,
      huella_dispositivo: this.huellaDispositivo,
      id_usuario: this.usuario?.id || null,
    }).subscribe({
      next: () => {
        this.registrando = false;
        Swal.fire({ icon: 'success', title: tipoRegistro.nombre, text: `Registrado correctamente. ${estado ? estado.nombre : ''}`, timer: 2500, showConfirmButton: false });
        this.cargarRegistrosHoy();
      },
      error: (e: any) => { this.registrando = false; Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'No se pudo registrar' }); },
    });
  }

  // === REGISTRO MANUAL ===

  abrirRegistroManual() {
    const tiposDisponibles = this.tiposRegistro.filter((t: any) => {
      if (t.codigo === 'jornada_entrada' || t.codigo === 'jornada_salida') return this.validaJornada;
      if (t.codigo === 'descanso_salida' || t.codigo === 'descanso_regreso') return this.validaDescanso;
      return true;
    });

    const opcionesTipos = tiposDisponibles.map((t: any) => `<option value="${t.id}">${t.nombre}</option>`).join('');

    Swal.fire({
      title: '<strong>Registro Manual</strong>',
      icon: 'info',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label fw-semibold">Tipo de registro <span class="text-danger">*</span></label>
            <select id="swal-tipo" class="form-select form-select-lg" style="border: 2px solid #e0e0e0; border-radius: 8px;">
              <option value="">Seleccionar</option>
              ${opcionesTipos}
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Fecha y hora real <span class="text-danger">*</span></label>
            <input type="datetime-local" id="swal-fecha-real" class="form-control form-control-lg" style="border: 2px solid #e0e0e0; border-radius: 8px;" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">Observaciones</label>
            <textarea id="swal-observaciones" class="form-control" rows="2" placeholder="Motivo del registro manual" style="border: 2px solid #e0e0e0; border-radius: 8px;"></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-save me-1"></i> Registrar',
      cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'btn btn-lg px-4', cancelButton: 'btn btn-outline-secondary btn-lg px-4' },
      buttonsStyling: false,
      didOpen: () => {
        const b = Swal.getConfirmButton();
        if (b) { b.style.background = 'linear-gradient(135deg, #f9a825 0%, #f57f17 100%)'; b.style.color = 'white'; b.style.border = 'none'; b.style.boxShadow = '0 4px 6px rgba(249, 168, 37, 0.3)'; b.style.marginRight = '10px'; }
      },
      preConfirm: () => {
        const idTipo = (document.getElementById('swal-tipo') as HTMLSelectElement).value;
        const fechaReal = (document.getElementById('swal-fecha-real') as HTMLInputElement).value;
        const observaciones = (document.getElementById('swal-observaciones') as HTMLTextAreaElement).value;

        if (!idTipo) { Swal.showValidationMessage('Selecciona un tipo de registro'); return false; }
        if (!fechaReal) { Swal.showValidationMessage('Ingresa la fecha y hora real'); return false; }

        if (this.registrosHoy.length > 0) {
          const ultimo = this.registrosHoy[this.registrosHoy.length - 1];
          const horaUltimo = ultimo.fecha_registro_real ? ultimo.fecha_registro_real.substring(11, 16) : ultimo.hora_registro.substring(0, 5);
          const horaManual = fechaReal.substring(11, 16);
          if (horaManual < horaUltimo) {
            Swal.showValidationMessage(`La hora (${horaManual}) no puede ser anterior al último registro (${horaUltimo})`);
            return false;
          }
        }

        return { id_tipo_registro: parseInt(idTipo), fecha_registro_real: fechaReal, observaciones: observaciones };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.registrando = true;
        this.registrosService.registrar({
          id_colaborador: this.idColaborador,
          id_tipo_registro: result.value.id_tipo_registro,
          fecha_registro_real: result.value.fecha_registro_real,
          latitud: this.latitudActual,
          longitud: this.longitudActual,
          distancia_metros: null,
          dentro_rango: this.dentroRango ? 1 : 0,
          id_estado: null,
          registro_manual: 1,
          observaciones: result.value.observaciones || null,
          user_agent: this.userAgent,
          huella_dispositivo: this.huellaDispositivo,
          id_usuario: this.usuario?.id || null,
        }).subscribe({
          next: () => { this.registrando = false; Swal.fire({ icon: 'success', title: 'Registro Manual', text: 'Registrado correctamente', timer: 2500, showConfirmButton: false }); this.cargarRegistrosHoy(); },
          error: (e: any) => { this.registrando = false; Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'No se pudo registrar' }); },
        });
      }
    });
  }

  // === ELIMINAR ===

  eliminarRegistro(reg: any) {
    Swal.fire({
      title: '¿Eliminar registro?',
      text: `${reg.nombre_tipo} - ${reg.hora_registro?.substring(0, 5)}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.registrosService.eliminar(reg.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Registro eliminado correctamente', timer: 2000, showConfirmButton: false });
            this.cargarRegistrosHoy();
          },
          error: (e: any) => Swal.fire({ icon: 'error', title: 'Error', text: e.error?.error || 'No se pudo eliminar' }),
        });
      }
    });
  }

  // === UTILIDADES ===

  obtenerIconoTipo(codigo: string): string {
    const iconos: any = { 'jornada_entrada': 'fas fa-sign-in-alt', 'jornada_salida': 'fas fa-sign-out-alt', 'descanso_salida': 'fas fa-coffee', 'descanso_regreso': 'fas fa-undo' };
    return iconos[codigo] || 'fas fa-clock';
  }

  obtenerColorEstado(codigo: string): string {
    const colores: any = { 'a_tiempo': '#28a745', 'tarde': '#dc3545', 'normal': '#17a2b8', 'salida_anticipada': '#ffc107', 'entrada_anticipada': '#6f42c1' };
    return colores[codigo] || '#6c757d';
  }

  // === HUELLA DEL DISPOSITIVO ===

  generarHuellaDispositivo() {
    this.userAgent = navigator.userAgent || '';
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 200;
        canvas.height = 50;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Lumen fingerprint', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Lumen fingerprint', 4, 17);
        const dataUrl = canvas.toDataURL();
        this.huellaDispositivo = this.hashSimple(dataUrl + '|' + this.userAgent + '|' + screen.width + 'x' + screen.height + '|' + navigator.language + '|' + new Date().getTimezoneOffset());
      }
    } catch (e) {
      this.huellaDispositivo = this.hashSimple(this.userAgent + '|' + screen.width + 'x' + screen.height);
    }
  }

  private hashSimple(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}