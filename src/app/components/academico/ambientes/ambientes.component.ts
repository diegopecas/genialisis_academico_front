import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AmbientesService } from '../../../services/ambientes.service';

/**
 * Listado de ambientes: los lugares donde se hacen las actividades académicas
 * (aula, piscina, zona verde...). Un ambiente inactivo no sale para escoger
 * en las actividades, pero las que ya lo tienen lo conservan.
 */
@Component({
  selector: 'app-ambientes',
  templateUrl: './ambientes.component.html',
  styleUrl: './ambientes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class AmbientesComponent implements OnInit {

  titulo = "Gestión de Ambientes";
  public columnasFiltro = ['Nombre', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [] as any[];

  constructor(
    private ambientesService: AmbientesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerAmbientes();
  }

  obtenerAmbientes() {
    this.ambientesService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.datos = body.map((ambiente: any) => ({
        ...ambiente,
        icono_texto: ambiente.icono || '',
        estado_texto: ambiente.activo == 1 ? 'Activo' : 'Inactivo',
        // Los inactivos se ven en gris para distinguirlos en el listado
        color: ambiente.activo == 1 ? '' : '#f1f1f1'
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'icono_texto',
        alias: 'Ícono',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'estado_texto',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['academico/ambientes/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarAmbiente($event.registro);
        break;
    }
  }

  async eliminarAmbiente(ambiente: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el ambiente ${ambiente.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.ambientesService.eliminar({ id: ambiente.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El ambiente ha sido eliminado.', 'success');
          this.obtenerAmbientes();
        },
        error: (error: any) => {
          // El mensaje del backend (por ejemplo, que actividades lo usan)
          // lo muestra el interceptor.
          console.error("Error al eliminar ambiente", error);
        }
      });
    }
  }
}
