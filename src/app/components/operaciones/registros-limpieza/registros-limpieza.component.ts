import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { RegistrosLimpiezaService } from '../../../services/registros-limpieza.service';
import { EstadosRegistroLimpiezaService } from '../../../services/estados-registro-limpieza.service';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-registros-limpieza',
  templateUrl: './registros-limpieza.component.html',
  styleUrls: ['./registros-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class RegistrosLimpiezaComponent implements OnInit {

  titulo = "Registros de Limpieza";
  public columnasFiltro = ['Fecha', 'Área', 'Proceso', 'Estado', 'Ejecutor'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public estados = [] as any[];

  public acciones = [
    { id: 'iniciar', label: 'Iniciar', icono: '/assets/images/iniciar.png' },
    { id: 'finalizar', label: 'Finalizar', icono: '/assets/images/finalizar.png' },
    { id: 'supervisar', label: 'Supervisar', icono: '/assets/images/aprobar.png' },
    { id: 'cancelar', label: 'Cancelar', icono: '/assets/images/anular.png' }
  ] as any[];

  constructor(
    private registrosService: RegistrosLimpiezaService,
    private estadosService: EstadosRegistroLimpiezaService,
    private router: Router,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerEstados();
    this.obtenerRegistros();
  }

  obtenerEstados() {
    this.estadosService.obtenerTodos().subscribe((response: any) => {
      this.estados = response.body;
    });
  }

  obtenerRegistros() {
    this.registrosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("obtenerRegistros", body)
      this.datos = body.map((r: any) => {
        // Formatear fecha
        r.fecha_formateada = this.formatearFecha(r.fecha);

        // Formatear horas
        r.hora_inicio_formateada = r.hora_inicio || '--:--';
        r.hora_fin_formateada = r.hora_fin || '--:--';

        // Calcular duración si tiene ambas horas
        if (r.hora_inicio && r.hora_fin) {
          r.duracion = this.calcularDuracion(r.hora_inicio, r.hora_fin);
        } else {
          r.duracion = '--';
        }

        // Badge de estado con color
        r.estado_badge = `<span class="badge" style="background-color: ${r.color_estado}">${r.nombre_estado}</span>`;

        // Permisos según estado
        switch (r.id_estado) {
          case 1: // Programado
            r.puede_iniciar = true;
            r.puede_editar = true;
            r.puede_cancelar = true;
            r.puede_finalizar = false;
            r.puede_supervisar = false;
            break;
          case 2: // En Proceso
            r.puede_iniciar = false;
            r.puede_editar = false;
            r.puede_cancelar = true;
            r.puede_finalizar = true;
            r.puede_supervisar = false;
            break;
          case 3: // Realizado
            r.puede_iniciar = false;
            r.puede_editar = false;
            r.puede_cancelar = false;
            r.puede_finalizar = false;
            r.puede_supervisar = true;
            break;
          case 4: // Supervisado
          case 5: // Cancelado
            r.puede_iniciar = false;
            r.puede_editar = false;
            r.puede_cancelar = false;
            r.puede_finalizar = false;
            r.puede_supervisar = false;
            break;
        }

        // Color de fila según estado
        if (r.id_estado === 5) r.color = "#ffebee"; // Cancelado
        else if (r.id_estado === 4) r.color = "#e8f5e9"; // Supervisado
        else if (r.id_estado === 3) r.color = "#e3f2fd"; // Realizado
        else if (r.id_estado === 2) r.color = "#fff3e0"; // En Proceso
        else r.color = "#f5f5f5"; // Programado

        return r;
      });
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: '#',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_programada_formateada',
        alias: 'F. Programada',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_formateada',
        alias: 'F. Registro',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_area',
        alias: 'Área',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_proceso',
        alias: 'Proceso',
        alinear: 'centrado',
      },
      {
        clave: 'hora_inicio_formateada',
        alias: 'Inicio',
        alinear: 'centrado',
      },
      {
        clave: 'hora_fin_formateada',
        alias: 'Fin',
        alinear: 'centrado',
      },
      {
        clave: 'duracion',
        alias: 'Duración',
        alinear: 'centrado',
      },
      {
        clave: 'total_elementos',
        alias: 'Elementos',
        alinear: 'centrado',
      },
      {
        clave: 'total_productos_consumidos',
        alias: 'Consumo',
        alinear: 'derecha',
      },
      {
        clave: 'estado_badge',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'html'
      },
      {
        clave: 'nombre_ejecutor',
        alias: 'Ejecutor',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    const registro = $event.registro;

    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['operaciones/registros-limpieza/consultar/' + registro.id]);
        break;
      case 'editar':
        if (registro.puede_editar) {
          this.router.navigate(['operaciones/registros-limpieza/editar/' + registro.id]);
        } else {
          Swal.fire('No permitido', 'Solo se pueden editar registros en estado Programado', 'warning');
        }
        break;
      case 'iniciar':
        this.iniciarRegistro(registro);
        break;
      case 'finalizar':
        this.finalizarRegistro(registro);
        break;
      case 'supervisar':
        this.supervisarRegistro(registro);
        break;
      case 'cancelar':
        this.cancelarRegistro(registro);
        break;
    }
  }

  async iniciarRegistro(registro: any) {
    if (!registro.puede_iniciar) {
      Swal.fire('No permitido', 'Este registro no puede ser iniciado', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Iniciar registro de limpieza?',
      html: `
        <p>Se registrará la hora de inicio y el estado cambiará a "En Proceso"</p>
        <p><strong>Área:</strong> ${registro.nombre_area}</p>
        <p><strong>Proceso:</strong> ${registro.nombre_proceso}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.registrosService.iniciar(registro.id).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Iniciado',
            text: `Registro iniciado a las ${response.body.hora_inicio}`,
            icon: 'success'
          });
          this.obtenerRegistros();
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo iniciar el registro', 'error');
        }
      });
    }
  }

  async finalizarRegistro(registro: any) {
    if (!registro.puede_finalizar) {
      Swal.fire('No permitido', 'Este registro no puede ser finalizado', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Finalizar registro de limpieza?',
      html: `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> <strong>Importante:</strong><br>
          Se descontarán los productos del inventario.<br>
          Esta acción no se puede deshacer.
        </div>
        <p><strong>Área:</strong> ${registro.nombre_area}</p>
        <p><strong>Proceso:</strong> ${registro.nombre_proceso}</p>
        <p><strong>Productos a consumir:</strong> ${registro.total_productos_consumidos || 0}</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, finalizar y descontar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const idUsuario = this.utilService.obtenerIdUsuarioActual();

      this.registrosService.finalizar(registro.id, idUsuario).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Finalizado',
            html: `
              Registro finalizado a las ${response.body.hora_fin}<br>
              Movimiento de inventario #${response.body.id_movimiento} creado
            `,
            icon: 'success'
          });
          this.obtenerRegistros();
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo finalizar el registro', 'error');
        }
      });
    }
  }

  async supervisarRegistro(registro: any) {
    if (!registro.puede_supervisar) {
      Swal.fire('No permitido', 'Este registro no puede ser supervisado', 'warning');
      return;
    }

    const { value: observaciones } = await Swal.fire({
      title: 'Supervisar registro',
      input: 'textarea',
      inputLabel: 'Observaciones de supervisión (opcional)',
      inputPlaceholder: 'Ingrese sus observaciones...',
      showCancelButton: true,
      confirmButtonText: 'Supervisar',
      cancelButtonText: 'Cancelar'
    });

    if (observaciones !== undefined) {
      const idUsuario = this.utilService.obtenerIdUsuarioActual();

      this.registrosService.supervisar(registro.id, idUsuario, observaciones).subscribe({
        next: () => {
          Swal.fire('Supervisado', 'El registro ha sido supervisado', 'success');
          this.obtenerRegistros();
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo supervisar el registro', 'error');
        }
      });
    }
  }

  async cancelarRegistro(registro: any) {
    if (!registro.puede_cancelar) {
      Swal.fire('No permitido', 'Este registro no puede ser cancelado', 'warning');
      return;
    }

    const { value: motivo } = await Swal.fire({
      title: 'Cancelar registro',
      input: 'text',
      inputLabel: 'Motivo de cancelación',
      inputPlaceholder: 'Ingrese el motivo...',
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un motivo';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Cancelar registro',
      cancelButtonText: 'Volver'
    });

    if (motivo) {
      this.registrosService.cancelar(registro.id, motivo).subscribe({
        next: () => {
          Swal.fire('Cancelado', 'El registro ha sido cancelado', 'success');
          this.obtenerRegistros();
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo cancelar el registro', 'error');
        }
      });
    }
  }

  formatearFecha(fecha: string): string {
    if (!fecha || fecha === '0000-00-00' || fecha === '0000-00-00 00:00:00') {
      return '--/--/----'; // O cualquier texto que prefieras para fechas no válidas
    }

    try {
      const date = new Date(fecha);

      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        return '--/--/----';
      }

      return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error al formatear fecha:', fecha, error);
      return '--/--/----';
    }
  }

  calcularDuracion(horaInicio: string, horaFin: string): string {
    const [hi, mi] = horaInicio.split(':').map(Number);
    const [hf, mf] = horaFin.split(':').map(Number);

    let minutos = (hf * 60 + mf) - (hi * 60 + mi);
    if (minutos < 0) minutos += 24 * 60; // Si cruza medianoche

    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;

    return `${horas}h ${mins}m`;
  }
}