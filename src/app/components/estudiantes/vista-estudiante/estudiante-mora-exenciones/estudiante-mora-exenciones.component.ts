import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MoraExencionesService } from '../../../../services/mora-exenciones.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { UtilService } from '../../../../common/constantes/util.service';

/**
 * Exenciones de mora del estudiante.
 *
 * Las exenciones se guardan contra la PERSONA, no contra el estudiante, porque
 * las cuentas por cobrar tambien apuntan a la persona. Por eso primero se
 * resuelve el id_persona a partir del estudiante.
 */
@Component({
  selector: 'app-estudiante-mora-exenciones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-mora-exenciones.component.html',
  styleUrl: './estudiante-mora-exenciones.component.scss'
})
export class EstudianteMoraExencionesComponent implements OnInit {
  @Input() idEstudiante!: string;

  public idPersona = '';
  public exenciones: any[] = [];
  public productos: any[] = [];
  public cargando = false;
  public guardando = false;
  public mostrarFormulario = false;

  public nueva = {
    id: '',
    id_producto_servicio: null as any,
    fecha_desde: '',
    fecha_hasta: null as any,
    motivo: ''
  };

  constructor(
    private moraExencionesService: MoraExencionesService,
    private productosServiciosService: ProductosServiciosService,
    private estudiantesService: EstudiantesService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
    this.resolverPersona();
  }

  /** El estudiante da el id_persona, que es contra quien se guarda la exencion. */
  resolverPersona() {
    if (!this.idEstudiante) {
      return;
    }

    this.cargando = true;
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        const estudiante = Array.isArray(body) ? body[0] : body;

        if (!estudiante || !estudiante.id_persona) {
          this.cargando = false;
          return;
        }

        this.idPersona = estudiante.id_persona;
        this.cargarExenciones();
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al obtener el estudiante', error);
      }
    });
  }

  cargarExenciones() {
    if (!this.idPersona) {
      return;
    }

    this.cargando = true;
    this.moraExencionesService.obtenerPorPersona(this.idPersona).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.exenciones = body as any[];
        this.cargando = false;
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al obtener las exenciones', error);
      }
    });
  }

  cargarProductos() {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.productos = (body as any[]).filter((p: any) => Number(p.disponible) === 1);
      },
      error: (error: any) => console.error('Error al cargar productos', error)
    });
  }

  abrirFormulario() {
    this.nueva = {
      id: '',
      id_producto_servicio: null,
      fecha_desde: '',
      fecha_hasta: null,
      motivo: ''
    };
    this.mostrarFormulario = true;
  }

  editar(exencion: any) {
    this.nueva = {
      id: exencion.id,
      id_producto_servicio: exencion.id_producto_servicio || null,
      fecha_desde: exencion.fecha_desde,
      fecha_hasta: exencion.fecha_hasta || null,
      motivo: exencion.motivo || ''
    };
    this.mostrarFormulario = true;
  }

  cancelar() {
    this.mostrarFormulario = false;
  }

  guardar() {
    if (!this.nueva.fecha_desde) {
      Swal.fire('Campos incompletos', 'Indique desde qué fecha aplica la exención', 'warning');
      return;
    }
    if (this.nueva.fecha_hasta && this.nueva.fecha_hasta < this.nueva.fecha_desde) {
      Swal.fire('Fechas inválidas', 'La fecha hasta no puede ser anterior a la fecha desde', 'warning');
      return;
    }

    this.guardando = true;

    const data: any = {
      id_persona: this.idPersona,
      id_producto_servicio: this.nueva.id_producto_servicio || null,
      fecha_desde: this.nueva.fecha_desde,
      fecha_hasta: this.nueva.fecha_hasta || null,
      motivo: this.nueva.motivo || null,
      activo: 1,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    const peticion = this.nueva.id
      ? this.moraExencionesService.actualizar({ ...data, id: this.nueva.id })
      : this.moraExencionesService.crear(data);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarFormulario = false;
        this.cargarExenciones();
        Swal.fire(
          'Listo',
          'La exención se guardó. La mora del rango desaparece en el siguiente cálculo, salvo la que ya esté pagada.',
          'success'
        );
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al guardar la exención', error);
        const mensaje = error?.error?.error || 'No se pudo guardar la exención';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  /** Desactiva en vez de borrar, para conservar quien autorizo y por que. */
  desactivar(exencion: any) {
    Swal.fire({
      title: '¿Desactivar esta exención?',
      text: 'El estudiante volverá a causar intereses de mora.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }

      this.moraExencionesService.actualizar({
        id: exencion.id,
        id_persona: exencion.id_persona,
        id_producto_servicio: exencion.id_producto_servicio || null,
        fecha_desde: exencion.fecha_desde,
        fecha_hasta: exencion.fecha_hasta || null,
        motivo: exencion.motivo || null,
        activo: 0,
        id_usuario: this.utilService.obtenerIdUsuarioActual()
      }).subscribe({
        next: () => {
          this.cargarExenciones();
          Swal.fire('Listo', 'La exención quedó desactivada', 'success');
        },
        error: (error: any) => {
          console.error('Error al desactivar la exención', error);
          Swal.fire('Error', 'No se pudo desactivar la exención', 'error');
        }
      });
    });
  }

  describirVigencia(exencion: any): string {
    return exencion.fecha_hasta ? 'Hasta ' + exencion.fecha_hasta : 'Indefinida';
  }
}
