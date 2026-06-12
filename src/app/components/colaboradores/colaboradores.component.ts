import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColaboradoresService } from '../../services/colaboradores.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../common/header/header.component';
import { TablasComponent } from '../../common/tablas/tablas.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-colaboradores',
  templateUrl: './colaboradores.component.html',
  styleUrl: './colaboradores.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class ColaboradoresComponent implements OnInit {

  titulo = "Gestión de colaboradores";
  public titulos = [] as any[];
  public datos = [] as any[];
  public datosFiltrados = [] as any[];
  public filtro = "";

  public acciones = [
    { id: 'asistencia', label: 'Asistencia', icono: '/assets/images/asistencia.png' },
    { id: 'gestion_tiempo', label: 'Gestión Tiempo', icono: '/assets/images/tiempo.png' },
    { id: 'productos_servicios', label: 'Productos/Servicios', icono: '/assets/images/productos.png' },
    { id: 'pagos_recibidos', label: 'Pagos Recibidos', icono: '/assets/images/pagos.png' },
    { id: 'prestamos', label: 'Préstamos', icono: '/assets/images/prestamos.png' },
    { id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png' }
  ] as any[];

  constructor(
    private colaboradoresService: ColaboradoresService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarColaboradores();
  }

  cargarColaboradores() {
    this.colaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Colaboradores cargados:", body);

        this.datos = body.map(colaborador => ({
          ...colaborador,
          color: colaborador.activo === 0 ? "#e2e9f3" : "",
          estado: colaborador.activo === 0 ? "Inactivo" : "Activo"
        }));

        this.datosFiltrados = [...this.datos];
      }
    });
  }

  accionTabla(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.router.navigate(['/colaboradores/ver/' + event.id]);
        break;
      case 'editar':
        this.router.navigate(['/colaboradores/editar/' + event.id]);
        break;
      case 'eliminar':
        this.eliminar(event.registro);
        break;
      case 'asistencia':
        this.router.navigate(['/asistencia-colaborador/' + event.id]);
        break;
      case 'gestion_tiempo':
        this.router.navigate(['/colaboradores-gestion-tiempo/' + event.id]);
        break;
      case 'productos_servicios':
        this.router.navigate(['/colaboradores-productos-servicios/' + event.id]);
        break;
      case 'pagos_recibidos':
        this.router.navigate(['/colaboradores-pagos-recibidos/' + event.id]);
        break;
      case 'prestamos':
        this.router.navigate(['/colaboradores-prestamos/' + event.id]);
        break;
      case 'contratos':
        this.router.navigate(['/colaboradores-contratos/' + event.id]);
        break;
    }
  }

  eliminar(valor: any) {
    console.log("Eliminando colaborador:", valor);

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el colaborador ${valor.primer_nombre} ${valor.primer_apellido}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.colaboradoresService.eliminar(valor.id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El colaborador ha sido eliminado correctamente',
              timer: 2000,
              showConfirmButton: false
            });

            this.cargarColaboradores();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.error || 'No se pudo eliminar el colaborador'
            });
          }
        });
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre_completo', alias: 'Nombre completo', alinear: 'izquierda' },
      { clave: 'numero_identificacion', alias: 'Identificación', alinear: 'centrado' },
      { clave: 'nombre_rol', alias: 'Rol', alinear: 'centrado' },
      { clave: 'nombre_casa_colaborador', alias: 'Casa', alinear: 'centrado' },
      { clave: 'correo_electronico', alias: 'Correo', alinear: 'izquierda' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  buscar(event: any) {
    console.log("buscar", event);
  }
}