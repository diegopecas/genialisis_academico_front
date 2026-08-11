import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { MoraConfiguracionService } from '../../../../../services/mora-configuracion.service';
import { ProductosServiciosService } from '../../../../../services/productos-servicios.service';
import { TiposMoraService } from '../../../../../services/tipos-mora.service';

@Component({
  selector: 'app-crear-mora-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-mora-configuracion.component.html',
  styleUrl: './crear-mora-configuracion.component.scss'
})
export class CrearMoraConfiguracionComponent implements OnInit {
  public id = '0';
  public accion = '';
  public editable = false;
  public submitted = false;
  public titulo = 'Interés de mora';
  public regresar = '/administracion/financiero/mora-configuracion';

  public listas = {
    tiposMora: [] as any[],
    productosServicios: [] as any[]
  };

  public model = {
    id: '',
    id_producto_servicio: '',
    id_tipo_mora: null as any,
    valor_recargo: null as any,
    recargo_acumulable: 0,
    porcentaje_mensual: null as any,
    activo: 1,
    id_usuario: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moraConfiguracionService: MoraConfiguracionService,
    private tiposMoraService: TiposMoraService,
    private productosServiciosService: ProductosServiciosService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = 'Crear interés de mora';
          break;
        case 'editar':
          this.editable = true;
          this.titulo = 'Editar interés de mora';
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = 'Consultar interés de mora';
          break;
      }
    });
    this.consultarListas();
  }

  consultarListas() {
    const tiposMora$ = this.tiposMoraService.obtenerTodos();
    const productos$ = this.productosServiciosService.obtenerTodos();

    forkJoin([tiposMora$, productos$]).pipe(
      tap(([resTipos, resProductos]: any[]) => {
        this.listas.tiposMora = resTipos.body || resTipos;
        const todosProductos = resProductos.body || resProductos;
        this.listas.productosServicios = todosProductos.filter((p: any) => Number(p.disponible) === 1);
      })
    ).subscribe({
      next: () => {
        if (this.accion !== 'crear') {
          this.obtenerConfiguracion(this.id);
        }
      },
      error: (error) => {
        console.error('Error al cargar listas:', error);
      }
    });
  }

  obtenerConfiguracion(id: any) {
    this.moraConfiguracionService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        const registro = Array.isArray(body) ? body[0] : body;

        if (!registro) {
          Swal.fire('Error', 'No se encontró la configuración', 'error');
          return;
        }

        this.model = {
          ...registro,
          /* El select usa ngValue numérico; la base puede devolver el id como
             texto y sin convertirlo la opción no queda seleccionada. */
          id_tipo_mora: registro.id_tipo_mora !== null && registro.id_tipo_mora !== undefined
            ? Number(registro.id_tipo_mora)
            : null,
          recargo_acumulable: Number(registro.recargo_acumulable),
          activo: Number(registro.activo)
        };

        if (this.accion === 'editar') {
          this.titulo = 'Editar mora: ' + registro.nombre_producto_servicio;
        } else if (this.accion === 'consultar') {
          this.titulo = 'Consultar mora: ' + registro.nombre_producto_servicio;
        }
      },
      error: (error) => {
        console.error('Error al obtener la configuración:', error);
        Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
      }
    });
  }

  /** Código del tipo seleccionado. El HTML lo usa para mostrar solo los campos que aplican. */
  get codigoTipoSeleccionado(): string {
    const tipo = this.listas.tiposMora.find((t: any) => Number(t.id) === Number(this.model.id_tipo_mora));
    return tipo ? tipo.codigo : '';
  }

  get esRecargoFijo(): boolean {
    return this.codigoTipoSeleccionado === 'RECARGO_FIJO';
  }

  get esPorcentaje(): boolean {
    return this.codigoTipoSeleccionado === 'PORCENTAJE';
  }

  grabar() {
    this.submitted = true;

    if (!this.model.id_producto_servicio || !this.model.id_tipo_mora) {
      Swal.fire('Campos incompletos', 'Complete los campos obligatorios', 'warning');
      return;
    }

    if (this.esRecargoFijo && (!this.model.valor_recargo || Number(this.model.valor_recargo) <= 0)) {
      Swal.fire('Campos incompletos', 'El recargo fijo debe ser mayor que cero', 'warning');
      return;
    }

    if (this.esPorcentaje && (!this.model.porcentaje_mensual || Number(this.model.porcentaje_mensual) <= 0)) {
      Swal.fire('Campos incompletos', 'El porcentaje mensual debe ser mayor que cero', 'warning');
      return;
    }

    /* Los dos tipos son excluyentes: se envía en nulo lo que no corresponde
       para no dejar datos que confundan al motor. */
    const dataEnviar = {
      ...this.model,
      id_tipo_mora: Number(this.model.id_tipo_mora),
      valor_recargo: this.esRecargoFijo ? Number(this.model.valor_recargo) : null,
      recargo_acumulable: this.esRecargoFijo ? Number(this.model.recargo_acumulable) : 0,
      porcentaje_mensual: this.esPorcentaje ? Number(this.model.porcentaje_mensual) : null,
      activo: Number(this.model.activo)
    };

    const servicio = this.accion === 'crear'
      ? this.moraConfiguracionService.crear(dataEnviar)
      : this.moraConfiguracionService.actualizar(dataEnviar);

    servicio.subscribe({
      next: () => {
        Swal.fire('Listo', 'La configuración se guardó correctamente', 'success');
        this.volver();
      },
      error: (error) => {
        console.error('Error al grabar la configuración de mora:', error);
        const mensaje = error?.error?.error || 'No se pudo guardar la configuración';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
