import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-registro-masivo-limpieza',
  templateUrl: './registro-masivo-limpieza.component.html',
  styleUrls: ['./registro-masivo-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class RegistroMasivoLimpiezaComponent implements OnInit {

  titulo = 'Registro Masivo de Aseo';

  procesos: any[] = [];
  usuarios: any[] = [];

  idProceso = '';
  fechaDesde = this.primerDiaMes();
  fechaHasta = this.hoy();
  horaInicio = '08:00';
  horaFin = '10:00';
  idEjecutor = '';
  idSupervisor = '';
  observaciones = '';

  // Preview
  areas: any[] = [];
  totalDiasLaborales = 0;
  cargandoPreview = false;
  yaConsulto = false;
  guardando = false;

  constructor(
    private router: Router,
    private registrosService: RegistrosLimpiezaService,
    private procesosService: TiposProcesosLimpiezaService,
    private usuariosService: UsuariosService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarProcesos();
    this.cargarUsuarios();
  }

  cargarProcesos() {
    this.procesosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.procesos = response.body || [];
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los procesos', 'error')
    });
  }

  cargarUsuarios() {
    this.usuariosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.usuarios = (response.body || [])
          .filter((u: any) => Number(u.activo) === 1 && Number(u.acceso_institucional) === 1)
          .map((u: any) => ({ ...u, nombre_completo: this.armarNombre(u) }))
          .sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));

        const idActual = this.utilService.obtenerIdUsuarioActual();
        if (idActual && this.usuarios.some((u: any) => u.id === idActual)) {
          this.idEjecutor = idActual;
        }
      },
      error: () => Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error')
    });
  }

  private armarNombre(usuario: any): string {
    const nombre = [
      usuario.primer_nombre,
      usuario.segundo_nombre,
      usuario.primer_apellido,
      usuario.segundo_apellido
    ].filter(Boolean).join(' ').trim();
    return nombre || usuario.usuario;
  }

  get mismoEjecutorYSupervisor(): boolean {
    return !!this.idSupervisor && this.idSupervisor === this.idEjecutor;
  }

  get puedeConsultar(): boolean {
    return !!this.idProceso && !!this.fechaDesde && !!this.fechaHasta && !this.cargandoPreview;
  }

  consultar() {
    if (!this.puedeConsultar) return;
    if (this.fechaDesde > this.fechaHasta) {
      Swal.fire('Atención', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargandoPreview = true;
    this.yaConsulto = true;

    this.registrosService.obtenerMasivoPreview(this.idProceso, this.fechaDesde, this.fechaHasta).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.areas = (body.areas || []).map((a: any) => ({
          ...a,
          // Se premarcan las que tienen días aplicables; las sin días quedan fuera
          seleccionada: !a.sin_dias && a.dias_aplicables > 0
        }));
        this.totalDiasLaborales = body.total_dias_laborales || 0;
        this.cargandoPreview = false;
      },
      error: (error: any) => {
        this.cargandoPreview = false;
        this.areas = [];
        Swal.fire('Error', error.error?.error || 'No se pudo calcular la vista previa', 'error');
      }
    });
  }

  toggleArea(area: any) {
    if (area.sin_dias) return; // Sin días no se puede seleccionar
    area.seleccionada = !area.seleccionada;
  }

  marcarTodas() {
    this.areas.forEach(a => { if (!a.sin_dias && a.dias_aplicables > 0) a.seleccionada = true; });
  }

  marcarNinguna() {
    this.areas.forEach(a => a.seleccionada = false);
  }

  get areasSeleccionadas(): any[] {
    return this.areas.filter(a => a.seleccionada);
  }

  get totalRegistros(): number {
    return this.areasSeleccionadas.reduce((t, a) => t + a.dias_aplicables, 0);
  }

  get hayAreasSinDias(): boolean {
    return this.areas.some(a => a.sin_dias);
  }

  get puedeRegistrar(): boolean {
    return this.areasSeleccionadas.length > 0
      && !!this.idProceso && !!this.idEjecutor
      && !!this.horaInicio && !!this.horaFin
      && !this.guardando;
  }

  async registrar() {
    if (!this.puedeRegistrar) return;

    if (this.mismoEjecutorYSupervisor) {
      const r = await Swal.fire({
        title: 'Ejecutor y supervisor iguales',
        text: 'La misma persona ejecuta y supervisa. ¿Continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#C98A00',
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar'
      });
      if (!r.isConfirmed) return;
    }

    const result = await Swal.fire({
      title: '¿Registrar el aseo?',
      html: `Se crearán <strong>${this.totalRegistros}</strong> registro(s) en
             <strong>${this.areasSeleccionadas.length}</strong> área(s),
             sobre los días laborales del rango.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#C98A00',
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar'
    });
    if (!result.isConfirmed) return;

    this.guardando = true;

    const datos = {
      id_tipo_proceso_limpieza: this.idProceso,
      fecha_desde: this.fechaDesde,
      fecha_hasta: this.fechaHasta,
      hora_inicio: this.horaInicio,
      hora_fin: this.horaFin,
      observaciones: this.observaciones || null,
      id_usuario_ejecutor: this.idEjecutor,
      id_usuario_supervisor: this.idSupervisor || null,
      areas: this.areasSeleccionadas.map(a => a.id_area_fisica)
    };

    this.registrosService.crearMasivo(datos).subscribe({
      next: (response: any) => {
        this.guardando = false;
        const creados = response.body.total_creados;
        Swal.fire('Listo', `Se crearon ${creados} registro(s) de aseo`, 'success')
          .then(() => this.router.navigate(['/operaciones/registros-limpieza']));
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error.error?.error || 'No se pudo registrar el aseo', 'error');
      }
    });
  }

  get nombreProceso(): string {
    const p = this.procesos.find(x => x.id === this.idProceso);
    return p ? p.nombre : '';
  }

  regresar() {
    this.router.navigate(['/operaciones']);
  }

  private hoy(): string {
    return this.formatoLocal(new Date());
  }

  private primerDiaMes(): string {
    const f = new Date();
    return this.formatoLocal(new Date(f.getFullYear(), f.getMonth(), 1));
  }

  private formatoLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}