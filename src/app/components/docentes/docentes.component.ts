
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DocentesService } from '../../services/docentes.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../common/header/header.component';
import { TablasComponent } from '../../common/tablas/tablas.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-docentes',
  templateUrl: './docentes.component.html',
  styleUrl: './docentes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class DocentesComponent implements OnInit {

  titulo = "Gestión de docentes";
  public titulos = [] as any[];
  public datos = [] as any[];
  public datosFiltrados = [] as any[];
  public filtro = "";

  // NUEVO: Array de acciones personalizadas
  public acciones = [
    { id: 'gestion_tiempo', label: 'Gestión Tiempo', icono: '/assets/images/tiempo.png' }
  ] as any[];

  constructor(
    private docentesService: DocentesService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.cargarDocentes();
  }

  cargarDocentes() {
    this.docentesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Docentes cargados:", body);
        this.datos = body;
        this.datosFiltrados = [...this.datos];
      }
    });
  }

  // ACTUALIZADO: Agregar case para gestion_tiempo
  accionTabla(event: any) {
    switch (event.accion) {
      case 'consultar':
        this.router.navigate(['/docentes/ver/' + event.id]);
        break;
      case 'editar':
        this.router.navigate(['/docentes/editar/' + event.id]);
        break;
      case 'eliminar':
        this.eliminar(event.registro);
        break;
      case 'gestion_tiempo':
        this.router.navigate(['/docentes-gestion-tiempo/' + event.id]);
        break;
    }
  }

  eliminar(valor: any) {
    console.log("Eliminando docente:", valor);

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el docente ${valor.primer_nombre} ${valor.primer_apellido}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.docentesService.eliminar(valor.id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El docente ha sido eliminado correctamente',
              timer: 2000,
              showConfirmButton: false
            });

            this.cargarDocentes();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.error || 'No se pudo eliminar el docente'
            });
          }
        });
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'id',
        alinear: 'centrado',
      },
      {
        clave: 'primer_nombre',
        alias: 'Primer nombre',
        alinear: 'derecha',
      },
      {
        clave: 'segundo_nombre',
        alias: 'Segundo nombre',
        alinear: 'derecha',
      },
      {
        clave: 'primer_apellido',
        alias: 'Primer apellido',
        alinear: 'derecha',
      },
      {
        clave: 'segundo_apellido',
        alias: 'Segundo apellido',
        alinear: 'derecha',
      },
      {
        clave: 'activo',
        alias: 'Activo',
        alinear: 'centrado',
      },
    ];
  }

  buscar(event: any) {
    console.log("buscar", event);
  }
}