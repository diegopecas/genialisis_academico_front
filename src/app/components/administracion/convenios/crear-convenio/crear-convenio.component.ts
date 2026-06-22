import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ConveniosService } from '../../../../services/convenios.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';


@Component({
  selector: 'app-crear-convenio',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-convenio.component.html',
  styleUrl: './crear-convenio.component.scss'
})
export class CrearConvenioComponent implements OnInit {
  public id = '0';
  public accion = '';
  public editable = false;
  public submitted = false;
  public titulo = 'Convenios';
  public regresar = '/administracion/financiero/convenios';

  public listas = {
    productosServicios: [] as any[]
  };

  public model = {
    id: '',
    nombre: '',
    descripcion: '',
    id_producto_servicio: '',
    activo: 1
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private conveniosService: ConveniosService,
    private productosServiciosService: ProductosServiciosService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = 'Crear convenio';
          break;
        case 'editar':
          this.editable = true;
          this.titulo = 'Editar convenio';
          this.obtenerConvenio(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = 'Consultar convenio';
          this.obtenerConvenio(this.id);
          break;
      }
    });
    this.consultarProductosServicios();
  }

  consultarProductosServicios() {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const todos = response.body || response;
        // Solo clasificación 2 (Extra académico) y categoría 1 (servicios mensuales) activos
        this.listas.productosServicios = todos.filter((p: any) => 
          p.id_clasificacion_productos_servicios === 2 && 
          p.id_categoria_productos_servicios === 1 && 
          Number(p.disponible) === 1
        );
      },
      error: (error) => {
        console.error('Error al obtener productos/servicios:', error);
      }
    });
  }

  obtenerConvenio(id: any) {
    this.conveniosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.model = body;
        if (this.accion === 'editar') {
          this.titulo = 'Editar convenio: ' + this.model.nombre;
        } else if (this.accion === 'consultar') {
          this.titulo = 'Consultar convenio: ' + this.model.nombre;
        }
      },
      error: (error) => {
        console.error('Error al obtener convenio:', error);
        Swal.fire('Error', 'No se pudo cargar el convenio', 'error');
      }
    });
  }

  grabar() {
    this.submitted = true;
    if (!this.model.nombre || !this.model.id_producto_servicio) {
      Swal.fire('Campos incompletos', 'Complete los campos obligatorios', 'warning');
      return;
    }

    const servicio = this.accion === 'crear'
      ? this.conveniosService.crear(this.model)
      : this.conveniosService.actualizar(this.model);

    servicio.subscribe({
      next: (respuesta: any) => {
        const id = respuesta.id || respuesta.body?.id;
        if (id) {
          Swal.fire({
            title: this.accion === 'crear' ? 'Convenio creado' : 'Convenio actualizado',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
          }).then(() => this.volver());
        }
      },
      error: (error) => {
        console.error('Error al guardar convenio:', error);
        Swal.fire('Error', 'No se pudo guardar el convenio', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}