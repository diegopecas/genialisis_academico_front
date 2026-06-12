import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ConveniosService } from '../../../../services/convenios.service';
import { GruposService } from '../../../../services/grupos.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { ReglasCobroAutomaticoService } from '../../../../services/reglas-cobro-automatico.service';
import { TiposEventoCobroService } from '../../../../services/tipos-evento-cobro.service';


@Component({
  selector: 'app-crear-regla-cobro',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-regla-cobro.component.html',
  styleUrl: './crear-regla-cobro.component.scss'
})
export class CrearReglaCobroComponent implements OnInit {
  public id = '0';
  public accion = '';
  public editable = false;
  public submitted = false;
  public titulo = 'Reglas de Cobro';
  public regresar = '/administracion/financiero/reglas-cobro-automatico';

  public listas = {
    tiposEvento: [] as any[],
    productosServicios: [] as any[],
    grupos: [] as any[],
    convenios: [] as any[],
    diasSemana: [
      { id: 1, nombre: 'Lunes' },
      { id: 2, nombre: 'Martes' },
      { id: 3, nombre: 'Miércoles' },
      { id: 4, nombre: 'Jueves' },
      { id: 5, nombre: 'Viernes' },
      { id: 6, nombre: 'Sábado' },
      { id: 7, nombre: 'Domingo' },
    ]
  };

  public model = {
    id: 0,
    nombre: '',
    id_tipo_evento: '',
    id_producto_servicio: '',
    id_grupo: null as any,
    hora_desde: null as any,
    hora_hasta: null as any,
    id_dia_semana: null as any,
    id_convenio_exime: null as any,
    prioridad: 1,
    activo: 1
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reglasService: ReglasCobroAutomaticoService,
    private tiposEventoService: TiposEventoCobroService,
    private productosServiciosService: ProductosServiciosService,
    private gruposService: GruposService,
    private conveniosService: ConveniosService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = 'Crear regla de cobro';
          break;
        case 'editar':
          this.editable = true;
          this.titulo = 'Editar regla de cobro';
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = 'Consultar regla de cobro';
          break;
      }
    });
    this.consultarListas();
  }

  consultarListas() {
    const tiposEvento$ = this.tiposEventoService.obtenerTodos();
    const productos$ = this.productosServiciosService.obtenerTodos();
    const grupos$ = this.gruposService.obtenerTodos();
    const convenios$ = this.conveniosService.obtenerTodos();

    forkJoin([tiposEvento$, productos$, grupos$, convenios$]).pipe(
      tap(([resTipos, resProductos, resGrupos, resConvenios]: any[]) => {
        this.listas.tiposEvento = resTipos.body || resTipos;
        const todosProductos = resProductos.body || resProductos;
        // Solo clasificación 2 (Extra académico) y categoría 2 (servicios extras) activos
        this.listas.productosServicios = todosProductos.filter((p: any) => 
          Number(p.id_clasificacion_productos_servicios) === 2 && 
          Number(p.id_categoria_productos_servicios) === 2 && 
          Number(p.disponible) === 1
        );
        this.listas.grupos = resGrupos.body || resGrupos;
        this.listas.convenios = resConvenios.body || resConvenios;
      })
    ).subscribe({
      next: () => {
        if (this.accion !== 'crear') {
          this.obtenerRegla(this.id);
        }
      },
      error: (error) => {
        console.error('Error al cargar listas:', error);
      }
    });
  }

  obtenerRegla(id: any) {
    this.reglasService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.model = {
          ...body,
          hora_desde: body.hora_desde ? body.hora_desde.substring(0, 5) : null,
          hora_hasta: body.hora_hasta ? body.hora_hasta.substring(0, 5) : null
        };
        if (this.accion === 'editar') {
          this.titulo = 'Editar regla: ' + this.model.nombre;
        } else if (this.accion === 'consultar') {
          this.titulo = 'Consultar regla: ' + this.model.nombre;
        }
      },
      error: (error) => {
        console.error('Error al obtener regla:', error);
        Swal.fire('Error', 'No se pudo cargar la regla', 'error');
      }
    });
  }

  grabar() {
    this.submitted = true;
    if (!this.model.nombre || !this.model.id_tipo_evento || !this.model.id_producto_servicio) {
      Swal.fire('Campos incompletos', 'Complete los campos obligatorios', 'warning');
      return;
    }

    // Formatear horas para enviar con segundos
    const dataEnviar = {
      ...this.model,
      hora_desde: this.model.hora_desde ? this.model.hora_desde + ':00' : null,
      hora_hasta: this.model.hora_hasta ? this.model.hora_hasta + ':00' : null,
      id_grupo: this.model.id_grupo || null,
      id_dia_semana: this.model.id_dia_semana || null,
      id_convenio_exime: this.model.id_convenio_exime || null
    };

    const servicio = this.accion === 'crear'
      ? this.reglasService.crear(dataEnviar)
      : this.reglasService.actualizar(dataEnviar);

    servicio.subscribe({
      next: (respuesta: any) => {
        const id = respuesta.id || respuesta.body?.id;
        if (id) {
          Swal.fire({
            title: this.accion === 'crear' ? 'Regla creada' : 'Regla actualizada',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          }).then(() => this.volver());
        }
      },
      error: (error) => {
        console.error('Error al guardar regla:', error);
        Swal.fire('Error', 'No se pudo guardar la regla', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}