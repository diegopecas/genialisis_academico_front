import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { MoraExencionesService } from '../../../../../services/mora-exenciones.service';
import { PersonasService } from '../../../../../services/personas.service';
import { ProductosServiciosService } from '../../../../../services/productos-servicios.service';
import { UtilService } from '../../../../../common/constantes/util.service';

@Component({
  selector: 'app-crear-mora-exencion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-mora-exencion.component.html',
  styleUrl: './crear-mora-exencion.component.scss'
})
export class CrearMoraExencionComponent implements OnInit {
  public id = '0';
  public accion = '';
  public editable = false;
  public submitted = false;
  public titulo = 'Exención de mora';
  public regresar = '/administracion/financiero/mora-exenciones';

  public listas = {
    personas: [] as any[],
    productosServicios: [] as any[]
  };

  public model = {
    id: '',
    id_persona: '',
    id_producto_servicio: null as any,
    fecha_desde: '',
    fecha_hasta: null as any,
    motivo: '',
    activo: 1,
    id_usuario: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private moraExencionesService: MoraExencionesService,
    private personasService: PersonasService,
    private productosServiciosService: ProductosServiciosService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = 'Crear exención de mora';
          break;
        case 'editar':
          this.editable = true;
          this.titulo = 'Editar exención de mora';
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = 'Consultar exención de mora';
          break;
      }
    });
    this.consultarListas();
  }

  consultarListas() {
    const personas$ = this.personasService.obtenerTodos();
    const productos$ = this.productosServiciosService.obtenerTodos();

    forkJoin([personas$, productos$]).pipe(
      tap(([resPersonas, resProductos]: any[]) => {
        const todasPersonas = resPersonas.body || resPersonas;
        this.listas.personas = (todasPersonas as any[])
          .map((p: any) => ({ ...p, nombre_completo: this.armarNombre(p) }))
          .sort((a: any, b: any) => a.nombre_completo.localeCompare(b.nombre_completo));

        const todosProductos = resProductos.body || resProductos;
        this.listas.productosServicios = todosProductos.filter((p: any) => Number(p.disponible) === 1);
      })
    ).subscribe({
      next: () => {
        if (this.accion !== 'crear') {
          this.obtenerExencion(this.id);
        }
      },
      error: (error) => {
        console.error('Error al cargar listas:', error);
      }
    });
  }

  /** Evita los "null" intermedios cuando falta segundo nombre o apellido. */
  armarNombre(persona: any): string {
    return [persona.primer_nombre, persona.segundo_nombre, persona.primer_apellido, persona.segundo_apellido]
      .filter((parte: any) => !!parte)
      .join(' ');
  }

  obtenerExencion(id: any) {
    this.moraExencionesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        const registro = Array.isArray(body) ? body[0] : body;

        if (!registro) {
          Swal.fire('Error', 'No se encontró la exención', 'error');
          return;
        }

        this.model = {
          ...registro,
          id_producto_servicio: registro.id_producto_servicio || null,
          fecha_hasta: registro.fecha_hasta || null,
          activo: Number(registro.activo)
        };

        if (this.accion === 'editar') {
          this.titulo = 'Editar exención: ' + registro.nombre_persona;
        } else if (this.accion === 'consultar') {
          this.titulo = 'Consultar exención: ' + registro.nombre_persona;
        }
      },
      error: (error) => {
        console.error('Error al obtener la exención:', error);
        Swal.fire('Error', 'No se pudo cargar la exención', 'error');
      }
    });
  }

  grabar() {
    this.submitted = true;

    if (!this.model.id_persona || !this.model.fecha_desde) {
      Swal.fire('Campos incompletos', 'Complete los campos obligatorios', 'warning');
      return;
    }

    if (this.model.fecha_hasta && this.model.fecha_hasta < this.model.fecha_desde) {
      Swal.fire('Fechas inválidas', 'La fecha hasta no puede ser anterior a la fecha desde', 'warning');
      return;
    }

    const dataEnviar = {
      ...this.model,
      /* Vacío significa "todos los productos" / "sin vencimiento": van en nulo
         para que el motor los interprete bien. */
      id_producto_servicio: this.model.id_producto_servicio || null,
      fecha_hasta: this.model.fecha_hasta || null,
      activo: Number(this.model.activo),
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    const servicio = this.accion === 'crear'
      ? this.moraExencionesService.crear(dataEnviar)
      : this.moraExencionesService.actualizar(dataEnviar);

    servicio.subscribe({
      next: () => {
        Swal.fire(
          'Listo',
          'La exención se guardó. La mora se recalcula en el siguiente corte y desaparecerá la ya causada dentro del rango, salvo la que ya estuviera pagada.',
          'success'
        );
        this.volver();
      },
      error: (error) => {
        console.error('Error al grabar la exención de mora:', error);
        const mensaje = error?.error?.error || 'No se pudo guardar la exención';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
