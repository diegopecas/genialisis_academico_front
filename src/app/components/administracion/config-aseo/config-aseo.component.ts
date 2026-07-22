import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { AreasFisicasXProcesosLimpiezaConfigService } from '../../../services/areas-fisicas-x-procesos-limpieza-config.service';
import { PeriodicidadService } from '../../../services/periodicidad.service';
import { TiposProcesosLimpiezaService } from '../../../services/tipos-procesos-limpieza.service';


@Component({
  selector: 'app-config-aseo',
  templateUrl: './config-aseo.component.html',
  styleUrls: ['./config-aseo.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ConfigAseoComponent implements OnInit {

  titulo = 'Configuración de Aseo';

  procesos: any[] = [];
  periodicidades: any[] = [];
  idProceso = '';

  areas: any[] = [];
  busqueda = '';
  cargando = false;
  guardando = false;

  // Configuración a aplicar en lote
  config = {
    tiempo_estimado_minutos: 15,
    prioridad: 2,
    veces_por_dia: 1,
    id_periodicidad: 1,
    hora_sugerida: '',
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  };

  diasSemana = [
    { clave: 'lunes', label: 'Lun' },
    { clave: 'martes', label: 'Mar' },
    { clave: 'miercoles', label: 'Mié' },
    { clave: 'jueves', label: 'Jue' },
    { clave: 'viernes', label: 'Vie' },
    { clave: 'sabado', label: 'Sáb' },
    { clave: 'domingo', label: 'Dom' },
  ];

  constructor(
    private router: Router,
    private configService: AreasFisicasXProcesosLimpiezaConfigService,
    private procesosService: TiposProcesosLimpiezaService,
    private periodicidadService: PeriodicidadService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarPeriodicidades();
  }

  cargarPeriodicidades() {
    this.periodicidadService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.periodicidades = response.body || [];
      },
      error: () => console.error('No se pudieron cargar las periodicidades')
    });
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los procesos', 'error')
    });
  }

  onProcesoChange() {
    this.areas = [];
    if (!this.idProceso) return;
    this.cargarConfiguracion();
  }

  cargarConfiguracion() {
    this.cargando = true;
    this.configService.obtenerConfiguracion(this.idProceso).subscribe({
      next: (response: any) => {
        this.areas = (response.body || []).map((a: any) => ({
          ...a,
          seleccionada: false,
          tiene_config: Number(a.tiene_config) === 1
        }));
        this.cargando = false;
      },
      error: (error: any) => {
        this.cargando = false;
        this.areas = [];
        Swal.fire('Error', error.error?.error || 'No se pudo cargar la configuración', 'error');
      }
    });
  }

  // Áreas visibles según el texto de búsqueda (por nombre)
  get areasFiltradas(): any[] {
    const q = this.busqueda.trim().toLowerCase();
    if (!q) return this.areas;
    return this.areas.filter(a => (a.area || '').toLowerCase().includes(q));
  }

  // --- Selección de áreas ---
  // Los botones Todas/Ninguna/Sin configurar operan sobre lo que está VISIBLE
  // (respetan el filtro de búsqueda activo).
  toggleArea(area: any) {
    area.seleccionada = !area.seleccionada;
  }

  marcarTodas() {
    this.areasFiltradas.forEach(a => a.seleccionada = true);
  }

  marcarNinguna() {
    this.areasFiltradas.forEach(a => a.seleccionada = false);
  }

  marcarSinConfig() {
    this.areasFiltradas.forEach(a => a.seleccionada = !a.tiene_config);
  }

  get totalSeleccionadas(): number {
    return this.areas.filter(a => a.seleccionada).length;
  }

  // --- Días rápidos ---
  /** Lee el valor de un día por su clave (encapsula el acceso dinámico) */
  getDia(clave: string): boolean {
    return !!(this.config as any)[clave];
  }

  /** Cambia el valor de un día por su clave */
  setDia(clave: string, valor: boolean) {
    (this.config as any)[clave] = valor;
  }

  /** Alterna un día (para el click en el checkbox) */
  toggleDia(clave: string) {
    (this.config as any)[clave] = !(this.config as any)[clave];
  }

  aplicarEntreSemana() {
    this.config.lunes = this.config.martes = this.config.miercoles =
      this.config.jueves = this.config.viernes = true;
    this.config.sabado = this.config.domingo = false;
  }

  aplicarTodos() {
    this.diasSemana.forEach(d => (this.config as any)[d.clave] = true);
  }

  aplicarNinguno() {
    this.diasSemana.forEach(d => (this.config as any)[d.clave] = false);
  }

  get algunDiaMarcado(): boolean {
    return this.diasSemana.some(d => (this.config as any)[d.clave]);
  }

  get puedeAplicar(): boolean {
    return this.totalSeleccionadas > 0 && !!this.idProceso && !this.guardando;
  }

  async aplicar() {
    if (!this.puedeAplicar) return;

    if (!this.algunDiaMarcado) {
      const r = await Swal.fire({
        title: 'Sin días marcados',
        text: 'No seleccionaste ningún día. El área no se premarcará automáticamente en el registro rápido. ¿Continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#C98A00',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!r.isConfirmed) return;
    }

    const seleccionadas = this.areas.filter(a => a.seleccionada);

    const result = await Swal.fire({
      title: '¿Aplicar configuración?',
      html: `Se configurará el proceso en <strong>${seleccionadas.length}</strong> área(s).
             <br><small class="text-muted">Sobrescribe la configuración actual de esas áreas.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C98A00',
      confirmButtonText: 'Aplicar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.guardando = true;

    const datos = {
      id_proceso: this.idProceso,
      areas: seleccionadas.map(a => a.id_area_fisica),
      config: this.config
    };

    this.configService.asignarLote(datos).subscribe({
      next: (response: any) => {
        this.guardando = false;
        Swal.fire('Listo', `${response.body.total_aplicadas} área(s) configurada(s)`, 'success')
          .then(() => this.cargarConfiguracion());
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudo aplicar la configuración', 'error');
      }
    });
  }

  async quitar() {
    const seleccionadas = this.areas.filter(a => a.seleccionada);
    if (seleccionadas.length === 0) {
      Swal.fire('Atención', 'Seleccione al menos un área', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Quitar del proceso?',
      html: `Se quitará el proceso de <strong>${seleccionadas.length}</strong> área(s).
             <br><small class="text-muted">Esas áreas dejarán de premarcarse y de aparecer configuradas.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#C0392B',
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.guardando = true;

    this.configService.quitarLote({
      id_proceso: this.idProceso,
      areas: seleccionadas.map(a => a.id_area_fisica)
    }).subscribe({
      next: (response: any) => {
        this.guardando = false;
        Swal.fire('Listo', `${response.body.total_quitadas} área(s) actualizada(s)`, 'success')
          .then(() => this.cargarConfiguracion());
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudo quitar la configuración', 'error');
      }
    });
  }

  resumenDias(area: any): string {
    const activos = this.diasSemana.filter(d => Number(area[d.clave]) === 1).map(d => d.label);
    if (activos.length === 0) return 'sin días';
    if (activos.length === 7) return 'todos';
    if (activos.length === 5 && !Number(area['sabado']) && !Number(area['domingo'])) return 'L-V';
    return activos.join(', ');
  }

  regresar() {
    this.router.navigate(['/administracion/datos-maestros']);
  }
}