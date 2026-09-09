import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AsistenciaEdicionService } from '../../../services/asistencia-edicion.service';
import { GruposService } from '../../../services/grupos.service';
import { UtilService } from '../../../common/constantes/util.service';
import { PermisosService } from '../../../services/permisos.service';
import Swal from 'sweetalert2';

/**
 * Listado de los movimientos de asistencia de una fecha, para corregirlos o
 * eliminarlos.
 *
 * Los movimientos cuyos cobros ya tienen pagos aplicados salen bloqueados: no
 * se editan ni se eliminan, porque tocarlos descuadraría la cartera.
 */
@Component({
  selector: 'app-editar-asistencia',
  templateUrl: './editar-asistencia.component.html',
  styleUrl: './editar-asistencia.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class EditarAsistenciaComponent implements OnInit {

  titulo = "Editar Asistencia";

  public grupos = [] as any[];
  public idGrupo: any = null;
  public fecha: string = '';

  public titulos = [] as any[];
  public datos = [] as any[];
  // Ojo: el componente de tablas compara esto contra el ALIAS de la columna,
  // no contra la clave. Con las claves los desplegables no aparecian.
  // Estudiante no va como desplegable: para eso está el buscador, que ya
  // recorre todas las columnas visibles.
  public columnasFiltro = ['Grupo', 'Estado'] as any[];

  public cargando: boolean = false;

  // El permiso de eliminar va aparte del de la pantalla.
  public puedeEliminar: boolean = false;

  constructor(
    private asistenciaEdicionService: AsistenciaEdicionService,
    private gruposService: GruposService,
    private utilService: UtilService,
    private permisosService: PermisosService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.fecha = this.obtenerFechaActual();
    this.puedeEliminar = this.permisosService.tienePermiso('operaciones.editar_asistencia.eliminar');
    this.crearTitulos();
    this.consultaGrupos();
    this.consultar();
  }

  /**
   * Fecha de hoy en YYYY-MM-DD con hora local, no UTC.
   */
  private obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        // Tipo icono para que el color del grupo se vea en un punto al lado del
        // nombre. El color no se manda en la fila: el componente de tablas usa
        // dato.color para pintar el fondo completo y quedaba ilegible.
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'centrado',
        tipo: 'icono',
        iconoClase: 'fas fa-circle',
      },
      {
        clave: 'hora_ingreso',
        alias: 'Ingreso',
        alinear: 'centrado',
      },
      {
        clave: 'hora_salida',
        alias: 'Salida',
        alinear: 'centrado',
      },
      {
        clave: 'usuario_ingreso',
        alias: 'Registró ingreso',
        alinear: 'izquierda',
      },
      {
        clave: 'usuario_salida',
        alias: 'Registró salida',
        alinear: 'izquierda',
      },
      {
        clave: 'utiles_registrados',
        alias: 'Útiles',
        alinear: 'centrado',
      },
      {
        clave: 'cobros_generados',
        alias: 'Cobros',
        alinear: 'centrado',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      }
    ];
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

  consultar() {
    if (!this.fecha) {
      return;
    }

    this.cargando = true;

    this.asistenciaEdicionService.obtenerListado(this.fecha, this.idGrupo).subscribe({
      next: (respuesta: any) => {
        const movimientos = (respuesta.movimientos as any[]) || [];

        this.datos = movimientos.map((movimiento: any) => {
          // `color` se saca a proposito: el componente de tablas lo usa como
          // fondo de toda la fila y con seis grupos la tabla queda ilegible.
          const { color, ...resto } = movimiento;

          return {
            ...resto,
            hora_salida: movimiento.hora_salida || 'Sin salida',
            usuario_ingreso: movimiento.usuario_ingreso || '',
            usuario_salida: movimiento.usuario_salida || '',
            estado: movimiento.bloqueado ? 'Bloqueado' : 'Editable',
            // El color del grupo queda solo en el punto de esa columna.
            nombre_grupo_color: color,
            nombre_grupo_texto: movimiento.nombre_grupo,
            nombre_grupo_title: movimiento.nombre_grupo
          };
        });

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.datos = [];
        Swal.fire('Atención', 'No se pudieron consultar los registros de esa fecha.', 'error');
      }
    });
  }

  clicAccion($event: any) {
    const registro = $event.registro;

    switch ($event.accion) {
      case 'editar':
        if (registro.bloqueado) {
          Swal.fire('No permitido', 'Este registro tiene cobros con pagos aplicados. Anula el pago primero.', 'warning');
          return;
        }
        this.router.navigate(['operaciones/editar-asistencia/detalle/' + registro.id]);
        break;
      case 'eliminar':
        this.eliminar(registro);
        break;
    }
  }

  /**
   * El componente de tablas también emite `eliminar` por su propia acción.
   */
  eliminarDesdeTabla(registro: any) {
    this.eliminar(registro);
  }

  eliminar(registro: any) {
    if (!this.puedeEliminar) {
      Swal.fire('No permitido', 'No tienes permiso para eliminar registros de asistencia.', 'warning');
      return;
    }

    if (registro.bloqueado) {
      Swal.fire('No permitido', 'Este registro tiene cobros con pagos aplicados. Anula el pago primero.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Eliminar el registro?',
      html: `Se va a eliminar el movimiento de <b>${registro.estudiante}</b>.<br><br>`
        + 'Se anulan las cuentas por cobrar que generó, y se borran los útiles de ese día y las '
        + 'observaciones que quedaron en el observador.<br><br>Al acudiente se le avisa. Esto no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }

      const idUsuario = this.utilService.obtenerIdUsuarioActual();

      this.asistenciaEdicionService.eliminar(registro.id, idUsuario).subscribe({
        next: (respuesta: any) => {
          Swal.fire({
            title: 'Eliminado',
            html: `Se eliminó el registro.<br>`
              + `Cuentas anuladas: <b>${respuesta.cobros_anulados}</b><br>`
              + `Útiles borrados: <b>${respuesta.utiles_eliminados}</b><br>`
              + `Observaciones borradas: <b>${respuesta.observaciones_eliminadas}</b>`,
            icon: 'success'
          });
          this.consultar();
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo eliminar el registro.';
          Swal.fire('Atención', mensaje, 'error');
        }
      });
    });
  }
}
