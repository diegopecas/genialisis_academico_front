import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { UtilService } from '../../../../common/constantes/util.service';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ActividadesColaboradoresService } from '../../../../services/actividades-colaboradores.service';
import { ContabilizacionesService } from '../../../../services/contabilizaciones.service';

interface Colaborador {
  id_colaborador: number;
  nombre_colaborador: string;
  minutos_permisos: number;
  minutos_horas: number;
  valor_horas: number;
  cantidad_permisos: number;
  cantidad_horas: number;
  seleccionado: boolean;
  expandido: boolean;
  permisos?: any[];
  horas?: any[];
  permisosSeleccionados?: any[];
  horasSeleccionadas?: any[];
}

@Component({
  selector: 'app-contabilizacion-actividades-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './contabilizacion-actividades-colaboradores.component.html',
  styleUrl: './contabilizacion-actividades-colaboradores.component.scss'
})
export class ContabilizacionActividadesColaboradoresComponent implements OnInit {
  
  public titulo = "Contabilización de Actividades por Colaborador";
  public colaboradores: Colaborador[] = [];
  public cargando = false;
  public Math = Math;

  constructor(
    private router: Router,
    private actividadesColaboradoresService: ActividadesColaboradoresService,
    private contabilizacionesService: ContabilizacionesService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.cargarResumenColaboradores();
  }

  cargarResumenColaboradores() {
    this.cargando = true;
    this.actividadesColaboradoresService.obtenerResumenColaboradoresPendientes().subscribe({
      next: (response: any) => {
        const datos = response.body as any[];
        this.colaboradores = datos.map(item => ({
          ...item,
          seleccionado: false,
          expandido: false,
          permisos: [],
          horas: [],
          permisosSeleccionados: [],
          horasSeleccionadas: []
        }));
        this.cargando = false;
        console.log("Colaboradores cargados:", this.colaboradores.length);
      },
      error: error => {
        console.error('Error al cargar colaboradores:', error);
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los colaboradores',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  toggleExpandir(colaborador: Colaborador) {
    colaborador.expandido = !colaborador.expandido;
    
    // Si se expande y no tiene actividades cargadas, cargarlas
    if (colaborador.expandido && (!colaborador.permisos || colaborador.permisos.length === 0)) {
      this.cargarActividadesColaborador(colaborador);
    }
  }

  cargarActividadesColaborador(colaborador: Colaborador) {
    this.actividadesColaboradoresService.obtenerAprobadas().subscribe({
      next: (response: any) => {
        const todasActividades = response.body as any[];
        
        // Filtrar actividades de este colaborador
        const actividadesColaborador = todasActividades.filter(
          (act: any) => act.id_colaborador === colaborador.id_colaborador
        );

        // Separar por categoría
        colaborador.permisos = actividadesColaborador
          .filter((act: any) => act.id_categoria === 1)
          .map((act: any) => ({
            ...act,
            seleccionado: true, // Por defecto seleccionadas para modo automático
            duracion_formateada: this.formatearMinutos(act.minutos_disponibles),
            disponible_formateado: this.formatearMinutos(act.minutos_disponibles)
          }));

        colaborador.horas = actividadesColaborador
          .filter((act: any) => act.id_categoria === 2)
          .map((act: any) => {
            const valorCalculado = act.valor_hora ? 
              (act.minutos_disponibles / 60) * act.valor_hora : 0;
            return {
              ...act,
              seleccionado: true, // Por defecto seleccionadas
              duracion_formateada: this.formatearMinutos(act.minutos_disponibles),
              disponible_formateado: this.formatearMinutos(act.minutos_disponibles),
              valor_calculado_num: valorCalculado,
              valor_calculado: valorCalculado > 0 ? 
                `$${valorCalculado.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-'
            };
          });

        console.log(`Actividades de ${colaborador.nombre_colaborador}:`, 
          `Permisos: ${colaborador.permisos?.length}, Horas: ${colaborador.horas?.length}`);
      },
      error: error => {
        console.error('Error al cargar actividades:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las actividades del colaborador',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  toggleSeleccionColaborador(colaborador: Colaborador) {
    colaborador.seleccionado = !colaborador.seleccionado;
  }

  seleccionarTodos() {
    const todosSeleccionados = this.colaboradores.every(c => c.seleccionado);
    this.colaboradores.forEach(c => {
      // Solo seleccionar si tiene ambos (permisos y horas)
      if (c.minutos_permisos > 0 && c.minutos_horas > 0) {
        c.seleccionado = !todosSeleccionados;
      }
    });
  }

  toggleSeleccionActividad(actividad: any) {
    actividad.seleccionado = !actividad.seleccionado;
  }

  seleccionarTodasActividadesColaborador(colaborador: Colaborador, tipo: 'permisos' | 'horas') {
    const actividades = tipo === 'permisos' ? colaborador.permisos : colaborador.horas;
    if (!actividades) return;
    
    const todasSeleccionadas = actividades.every((a: any) => a.seleccionado);
    actividades.forEach((a: any) => a.seleccionado = !todasSeleccionadas);
  }

  cruzarColaborador(colaborador: Colaborador) {
    if (!colaborador.permisos || !colaborador.horas) {
      Swal.fire({
        title: 'Error',
        text: 'Debe cargar las actividades primero (expandir el colaborador)',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const permisosSelec = colaborador.permisos.filter((p: any) => p.seleccionado);
    const horasSelec = colaborador.horas.filter((h: any) => h.seleccionado);

    if (permisosSelec.length === 0 && horasSelec.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos un permiso o una hora adicional',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const minutosPermisosSelec = permisosSelec.reduce((sum: number, p: any) => 
      sum + (p.minutos_disponibles || 0), 0);
    const minutosHorasSelec = horasSelec.reduce((sum: number, h: any) => 
      sum + (h.minutos_disponibles || 0), 0);
    const valorHorasSelec = horasSelec.reduce((sum: number, h: any) => 
      sum + (h.valor_calculado_num || 0), 0);

    const minCruzados = Math.min(minutosPermisosSelec, minutosHorasSelec);
    const diferencia = Math.abs(minutosPermisosSelec - minutosHorasSelec);
    const tipo = minutosPermisosSelec > minutosHorasSelec ? 'permisos' : 'horas';

    Swal.fire({
      title: `¿Confirmar cruce de ${colaborador.nombre_colaborador}?`,
      html: `
        <div style="text-align: left;">
          <p><strong>Permisos seleccionados:</strong> ${permisosSelec.length} (${this.formatearMinutos(minutosPermisosSelec)})</p>
          <p><strong>Horas seleccionadas:</strong> ${horasSelec.length} (${this.formatearMinutos(minutosHorasSelec)})</p>
          <p><strong>Valor total horas:</strong> ${this.formatearValor(valorHorasSelec)}</p>
          <hr>
          <p><strong>Minutos a cruzar:</strong> ${this.formatearMinutos(minCruzados)}</p>
          ${diferencia > 0 ? `<p class="text-${tipo === 'permisos' ? 'danger' : 'success'}">
            <strong>Diferencia:</strong> ${this.formatearMinutos(diferencia)} de ${tipo} quedarán pendientes
          </p>` : '<p><strong>¡Balance perfecto!</strong></p>'}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cruzar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Observaciones (opcional)',
      inputAttributes: {
        'aria-label': 'Observaciones'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarCruceIndividual(colaborador, permisosSelec, horasSelec, result.value || '');
      }
    });
  }

  cruzarSeleccionadosAutomatico() {
    const colaboradoresSelec = this.colaboradores.filter(c => c.seleccionado);

    if (colaboradoresSelec.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos un colaborador',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Validar que todos tengan ambos tipos de actividades
    const sinPermisos = colaboradoresSelec.filter(c => c.minutos_permisos === 0);
    const sinHoras = colaboradoresSelec.filter(c => c.minutos_horas === 0);

    if (sinPermisos.length > 0 || sinHoras.length > 0) {
      let mensaje = 'Los siguientes colaboradores no pueden cruzarse:\n\n';
      if (sinPermisos.length > 0) {
        mensaje += `Sin permisos: ${sinPermisos.map(c => c.nombre_colaborador).join(', ')}\n`;
      }
      if (sinHoras.length > 0) {
        mensaje += `Sin horas: ${sinHoras.map(c => c.nombre_colaborador).join(', ')}`;
      }

      Swal.fire({
        title: 'Colaboradores incompletos',
        text: mensaje,
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const totalMinutosCruzar = colaboradoresSelec.reduce((sum, c) => 
      sum + Math.min(c.minutos_permisos, c.minutos_horas), 0);

    Swal.fire({
      title: '¿Confirmar cruce automático?',
      html: `
        <div style="text-align: left;">
          <p>Se cruzarán <strong>${colaboradoresSelec.length}</strong> colaboradores:</p>
          <ul style="max-height: 200px; overflow-y: auto; text-align: left;">
            ${colaboradoresSelec.map(c => `
              <li>${c.nombre_colaborador}: ${this.formatearMinutos(Math.min(c.minutos_permisos, c.minutos_horas))}</li>
            `).join('')}
          </ul>
          <hr>
          <p><strong>Total a cruzar:</strong> ${this.formatearMinutos(totalMinutosCruzar)}</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cruzar todos',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Observaciones (opcional)',
      inputAttributes: {
        'aria-label': 'Observaciones'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarCruceAutomatico(colaboradoresSelec, result.value || '');
      }
    });
  }

  procesarCruceIndividual(colaborador: Colaborador, permisos: any[], horas: any[], observaciones: string) {
    Swal.fire({
      title: 'Procesando cruce',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
    const idsPermisos = permisos.map(p => p.id);
    const idsHoras = horas.map(h => h.id);

    this.contabilizacionesService.cruzarActividades(
      idsPermisos, 
      idsHoras, 
      idUsuarioActual, 
      observaciones
    ).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          Swal.fire({
            title: 'Cruce exitoso',
            html: `
              <p>Se cruzaron <strong>${this.formatearMinutos(response.minutos_cruzados)}</strong></p>
              <p>Colaborador: <strong>${colaborador.nombre_colaborador}</strong></p>
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            // Recargar datos
            this.cargarResumenColaboradores();
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: response.message || 'Ocurrió un error al procesar el cruce',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error: any) => {
        console.error('Error al cruzar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al procesar el cruce',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  procesarCruceAutomatico(colaboradores: Colaborador[], observaciones: string) {
    Swal.fire({
      title: 'Procesando cruces',
      html: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

    // Cargar todas las actividades una sola vez
    this.actividadesColaboradoresService.obtenerAprobadas().subscribe({
      next: (response: any) => {
        const todasActividades = response.body as any[];
        
        // Preparar array para enviar al backend
        const colaboradoresData = colaboradores.map(colaborador => {
          const actividadesColaborador = todasActividades.filter(
            (act: any) => act.id_colaborador === colaborador.id_colaborador
          );

          return {
            id_colaborador: colaborador.id_colaborador,
            ids_permisos: actividadesColaborador
              .filter((act: any) => act.id_categoria === 1)
              .map((act: any) => act.id),
            ids_horas: actividadesColaborador
              .filter((act: any) => act.id_categoria === 2)
              .map((act: any) => act.id)
          };
        }).filter(c => c.ids_permisos.length > 0 && c.ids_horas.length > 0);

        if (colaboradoresData.length === 0) {
          Swal.fire({
            title: 'Sin datos',
            text: 'Ningún colaborador seleccionado tiene permisos y horas para cruzar',
            icon: 'warning',
            confirmButtonText: 'Aceptar'
          });
          return;
        }

        // UN SOLO POST al backend con todos los colaboradores
        this.contabilizacionesService.cruzarMultiplesColaboradores(
          colaboradoresData,
          idUsuarioActual,
          observaciones
        ).subscribe({
          next: (response: any) => {
            if (response && response.success) {
              Swal.fire({
                title: 'Proceso completado',
                html: `
                  <p><strong>${response.colaboradores_procesados}</strong> colaborador(es) procesado(s) exitosamente</p>
                `,
                icon: 'success',
                confirmButtonText: 'Aceptar'
              }).then(() => {
                this.cargarResumenColaboradores();
              });
            } else {
              Swal.fire({
                title: 'Error',
                text: response.message || 'Ocurrió un error al procesar los cruces',
                icon: 'error',
                confirmButtonText: 'Aceptar'
              });
            }
          },
          error: (error: any) => {
            console.error('Error al cruzar múltiples:', error);
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al procesar los cruces',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      },
      error: (error : any) => {
        console.error('Error al cargar actividades:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las actividades',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  formatearMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatearValor(valor: number): string {
    return `$${valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  puedeHacerCruce(colaborador: Colaborador): boolean {
    return colaborador.minutos_permisos > 0 && colaborador.minutos_horas > 0;
  }

  // NUEVOS MÉTODOS HELPER PARA EL TEMPLATE
  calcularPermisosSeleccionados(colaborador: Colaborador): number {
    if (!colaborador.permisos) return 0;
    return colaborador.permisos
      .filter(p => p.seleccionado)
      .reduce((sum, p) => sum + (p.minutos_disponibles || 0), 0);
  }

  calcularHorasSeleccionadas(colaborador: Colaborador): number {
    if (!colaborador.horas) return 0;
    return colaborador.horas
      .filter(h => h.seleccionado)
      .reduce((sum, h) => sum + (h.minutos_disponibles || 0), 0);
  }

  calcularValorHorasSeleccionadas(colaborador: Colaborador): number {
    if (!colaborador.horas) return 0;
    return colaborador.horas
      .filter(h => h.seleccionado)
      .reduce((sum, h) => sum + (h.valor_calculado_num || 0), 0);
  }

  calcularMinutosCruzar(colaborador: Colaborador): number {
    const permisos = this.calcularPermisosSeleccionados(colaborador);
    const horas = this.calcularHorasSeleccionadas(colaborador);
    return Math.min(permisos, horas);
  }

  algunoSeleccionado(): boolean {
    return this.colaboradores.some(c => c.seleccionado);
  }

  regresar() {
    this.router.navigate(['/administracion']);
  }
}