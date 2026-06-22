// crear-onces-alimentacion.component.ts (actualizado)
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../../common/searchable-dropdown/searchable-dropdown.component';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { AsistenciaEstudiantesService } from '../../../../services/asistencia-estudiantes.service';
import { CuentaPagadaService } from '../../../../services/cuenta-pagada.service';
import { HorariosAlimentacionService } from '../../../../services/horarios-alimentacion.service';
import { ClasificacionProductosServicios, PeriodicidadCobro } from './constantes';

// Interfaz para el modelo de cuenta actualizada
interface CuentaModel {
  id: string;
  id_producto_servicio: string;
  id_persona: string;
  fecha: string;
  valor: number;
  detalle: string;
  id_usuario: string | null;
  id_horario_alimentacion: string | null;
  // Estas propiedades se calculan en el backend y son de solo lectura
  valor_pagado?: number;
  saldo?: number;
}

// Interfaz para los pagos aplicados
interface PagoAplicado {
  id: string;
  id_cuenta_por_cobrar: string;
  id_pago_recibido: string;
  valor_aplicado: number;
  fecha_aplicacion: string;
  fecha_pago: string;
  referencia_bancaria?: string;
  anulado?: number;
  tipo_pago: string;
}

// Interfaz para los productos y servicios
interface ProductoServicio {
  clasificacion_codigo?: string;
  id: string;
  nombre: string;
  id_clasificacion_productos_servicios: string;
  id_periodicidad_cobro: number;
  valor_sugerido?: number;
  id_horario_alimentacion_sugerido?: string;
  detalles?: string;
  disponible?: number;
}

@Component({
  selector: 'app-crear-onces-alimentacion',
  templateUrl: './crear-onces-alimentacion.component.html',
  styleUrl: './crear-onces-alimentacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent]
})
export class CrearOncesAlimentacionComponent implements OnInit {

  public id = "0";
  public idEstudiante = "0";
  public accion = "";
  public editable = false;
  public submitted = false;
  public estudiante: any;
  public nombre_estudiante = "";
  public titulo = "Gestión de onces y alimentación del día ";
  public regresar = '/estudiantes-onces/'
  public listas = {
    productosServicios: [] as any[],
    horariosAlimentacion: [] as any[]
  }

  // Variables para el dropdown personalizado
  public productosDropdownItems: DropdownItem[] = [];

  // Valores calculados (solo lectura)
  public valorPagado = 0;
  public saldoCalculado = 0;

  // Variables para formateo
  public valorFormateado: string = '';
  public saldoFormateado: string = '';
  public valorPagadoFormateado: string = '';
  
  // Nueva variable para la fecha formateada
  public fechaHoyFormateada: string = '';

  // Nueva propiedad para almacenar los pagos aplicados a esta cuenta
  public pagosAplicados: PagoAplicado[] = [];

  // Nueva propiedad para determinar si los campos deben estar bloqueados en edición
  public camposBloqueados = false;

  public model: CuentaModel = {
    id: '',
    id_producto_servicio: "",
    id_persona: "",
    fecha: "",
    valor: 0,
    detalle: "",
    id_usuario: null,
    id_horario_alimentacion: null
  };
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cuentasService: CuentasPorCobrarService,
    private productosServiciosService: ProductosServiciosService,
    private estudiantesService: EstudiantesService,
    private utilService: UtilService,
    private asistenciaEstudiantesService: AsistenciaEstudiantesService,
    private cuentaPagadaService: CuentaPagadaService,
    private horariosAlimentacionService: HorariosAlimentacionService
  ) { }

  ngOnInit() {
    // Configuramos la fecha de hoy
    const hoy = new Date();
    this.model.fecha = hoy.toISOString().split('T')[0];
    
    // Formatear la fecha para mostrar en el título o etiqueta
    this.fechaHoyFormateada = hoy.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idEstudiante = params['idEstudiante'];
      this.regresar = this.regresar + this.idEstudiante
      this.obtenerEstudiante(this.idEstudiante);
      
      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.camposBloqueados = false;
          this.consultarListas();
          this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
          this.valorPagado = 0;
          this.saldoCalculado = 0;
          this.valorFormateado = '0';
          this.saldoFormateado = '0';
          this.valorPagadoFormateado = '0';
          break;
        case 'editar':
          this.editable = true;
          this.consultarListas();
          this.obtenerCuenta(this.id);
          this.obtenerPagosAplicados(this.id, true);
          break;
        case 'consultar':
          this.editable = false;
          this.camposBloqueados = true;
          this.consultarListas();
          this.obtenerCuenta(this.id);
          this.obtenerPagosAplicados(this.id);
          break;
      }
    });
    
    this.actualizarSaldo();
  }

  // Método para formatear valores monetarios sin decimales
  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // Método para formatear un valor al escribirlo
  onValorInput(event: any) {
    const inputValue = event.target.value.replace(/[^\d]/g, '');

    if (inputValue === '') {
      this.model.valor = 0;
      this.valorFormateado = '0';
    } else {
      this.model.valor = parseInt(inputValue, 10);
      this.valorFormateado = this.formatearMoneda(this.model.valor);
    }

    this.actualizarSaldo();
  }

  // Método para obtener los pagos aplicados a una cuenta
  obtenerPagosAplicados(idCuenta: string, esEdicion: boolean = false) {
    this.pagosAplicados = [];

    this.cuentaPagadaService.obtenerPorCuentaPorCobrar(idCuenta).subscribe({
      next: (response: any) => {
        if (response.body && Array.isArray(response.body)) {
          this.pagosAplicados = response.body;

          if (esEdicion && this.pagosAplicados.length > 0) {
            this.camposBloqueados = true;

            Swal.fire({
              title: 'Información',
              text: 'Este registro de onces ya tiene pagos aplicados. Solo podrá modificar la fecha y el detalle.',
              icon: 'info',
              confirmButtonText: 'Entendido'
            });
          }
        }
      },
      error: (error) => {
        console.error('Error al obtener pagos aplicados:', error);
        Swal.fire('Error', 'Hubo un problema al obtener la información de pagos', 'error');
      }
    });
  }

  consultarListas() {
    // Cargar productos de alimentación
    this.productosServiciosService.obtenerTodos().subscribe((response: any) => {
      const todosProductos = response.body;
      
      // Filtrar productos de clasificación ALIMENTACION y periodicidad DIARIO
      this.listas.productosServicios = todosProductos.filter((producto: ProductoServicio) => 
        producto.clasificacion_codigo === 'ALIMENTACION' &&
        Number(producto.id_periodicidad_cobro) === PeriodicidadCobro.DIARIO
      );
      console.log("productosServiciosService", this.listas.productosServicios);
      // Convertir a formato DropdownItem
      this.productosDropdownItems = this.listas.productosServicios.map(producto => ({
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.detalles,
        disabled: producto.disponible === 0
      }));
      
      console.log("Productos de Alimentación Diaria cargados:", this.productosDropdownItems.length);
    });

    // Cargar horarios de alimentación
    this.horariosAlimentacionService.obtenerTodos().subscribe((response: any) => {
      this.listas.horariosAlimentacion = response.body;
      console.log("Horarios de Alimentación cargados:", this.listas.horariosAlimentacion.length);
    });
  }

  // Evento cuando se selecciona un producto en el dropdown
  onProductoSeleccionado(producto: DropdownItem | null) {
    if (producto) {
      this.model.id_producto_servicio = producto.id.toString();
      this.asignarValorSugerido();
    } else {
      this.model.id_producto_servicio = "";
      this.model.valor = 0;
      this.valorFormateado = '0';
      this.actualizarSaldo();
    }
  }

  obtenerCuenta(id: any) {
    this.cuentasService.obtenerById(id).subscribe((response: any) => {
      const body = response.body;
      this.model = body[0];

      this.valorPagado = this.model.valor_pagado || 0;
      this.saldoCalculado = this.model.saldo || 0;

      this.valorFormateado = this.formatearMoneda(this.model.valor);
      this.valorPagadoFormateado = this.formatearMoneda(this.valorPagado);
      this.saldoFormateado = this.formatearMoneda(this.saldoCalculado);
    });
  }

  // Validar que el estudiante tenga asistencia para la fecha seleccionada
  verificarAsistenciaEstudiante(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let data = {
        id_estudiante: this.idEstudiante,
        fecha: this.model.fecha
      };

      this.asistenciaEstudiantesService.verificarAsistenciaEstudiante(data).subscribe({
        next: (response: any) => {
          resolve(response.tiene_asistencia);
        },
        error: (err) => {
          console.error('Error verificando asistencia', err);
          reject(false);
        }
      });
    });
  }

  async grabar() {
    this.submitted = true;
    if (!this.formularioValido()) return;

    // Validar asistencia
    const tieneAsistencia = await this.verificarAsistenciaEstudiante();
    if (!tieneAsistencia) {
      Swal.fire('Atención', 'El estudiante no tiene asistencia registrada para esta fecha. No se puede registrar una onces sin asistencia.', 'warning');
      return;
    }

    if (this.accion === 'crear') {
      this.cuentasService.verificarDuplicados(this.model).subscribe({
        next: (respuesta: any) => {
          if (respuesta.cantidad > 0) {
            let tablaHTML = '<table class="table table-sm"><thead><tr><th>Fecha</th><th>Horario</th><th>Valor</th></tr></thead><tbody>';
            respuesta.duplicados.forEach((dup: any) => {
              tablaHTML += `<tr><td>${dup.fecha}</td><td>${dup.nombre_horario_alimentacion || 'Sin horario'}</td><td>$ ${this.formatearMoneda(dup.valor)}</td></tr>`;
            });
            tablaHTML += '</tbody></table>';

            Swal.fire({
              title: '¡Atención!',
              html: `Se encontraron ${respuesta.cantidad} registros similares para la misma fecha:<br>${tablaHTML}<br>¿Desea continuar con la creación?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, continuar',
              cancelButtonText: 'No, cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                this.procesarCreacionActualizacion();
              }
            });
          } else {
            this.procesarCreacionActualizacion();
          }
        },
        error: (error) => {
          console.error('Error al verificar duplicados:', error);
          Swal.fire('Error', 'Hubo un problema al verificar duplicados', 'error');
        }
      });
    } else {
      this.procesarCreacionActualizacion();
    }
  }

  private procesarCreacionActualizacion() {
    const servicio = this.accion === 'crear'
      ? this.cuentasService.crear(this.model)
      : this.cuentasService.actualizar(this.model);

    servicio.subscribe({
      next: (response: any) => {
        if (response.id) {
          Swal.fire({
            title: this.accion === 'crear' ? 'Onces registradas con éxito' : 'Onces actualizadas',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.accion === 'crear') {
              this.limpiarFormulario();
            } else {
              this.volver();
            }
          });
        } else {
          Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
        }
      },
      error: (error) => {
        console.error('Error al procesar la operación:', error);
        Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
      }
    });
  }

  formularioValido() {
    return this.model.id_producto_servicio &&
      this.model.id_persona &&
      this.model.valor > 0 &&
      this.model.fecha &&
      this.model.id_horario_alimentacion;
  }

  limpiarFormulario() {
    this.model = {
      id: '',
      id_producto_servicio: "",
      id_persona: this.estudiante?.id_persona || "",
      fecha: this.model.fecha,
      valor: 0,
      detalle: "",
      id_usuario: null,
      id_horario_alimentacion: null
    };
    this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
    this.valorPagado = 0;
    this.saldoCalculado = 0;
    this.submitted = false;
    this.camposBloqueados = false;

    this.valorFormateado = '0';
    this.valorPagadoFormateado = '0';
    this.saldoFormateado = '0';
  }

  volver() {
    this.router.navigate(['/estudiantes-onces/' + this.idEstudiante]);
  }

  asignarValorSugerido() {
    if (!this.camposBloqueados) {
      const producto = this.listas.productosServicios.find(p => p.id === this.model.id_producto_servicio);
      if (producto) {
        this.model.valor = producto.valor_sugerido || 0;
        this.valorFormateado = this.formatearMoneda(this.model.valor);

        if (producto.id_horario_alimentacion_sugerido) {
          this.model.id_horario_alimentacion = producto.id_horario_alimentacion_sugerido;
        }

        this.actualizarSaldo();
      }
    }
  }

  actualizarSaldo() {
    if (this.accion === 'crear') {
      this.saldoCalculado = this.model.valor;
      this.valorPagado = 0;
    } else {
      this.saldoCalculado = this.model.valor - this.valorPagado;
      if (this.saldoCalculado < 0) this.saldoCalculado = 0;
    }

    this.saldoFormateado = this.formatearMoneda(this.saldoCalculado);
    this.valorPagadoFormateado = this.formatearMoneda(this.valorPagado);
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.model.id_persona = this.estudiante.id_persona
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      this.titulo = this.titulo + " para " + this.nombre_estudiante + " (" + this.fechaHoyFormateada + ")";
    })
  }
}