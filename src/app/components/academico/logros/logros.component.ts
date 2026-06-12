import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component'; 
import { TablasComponent } from '../../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { LogrosService } from '../../../services/logros.service';

@Component({
  selector: 'app-logros',
  templateUrl: './logros.component.html',
  styleUrls: ['./logros.component.scss'], 
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class LogrosComponent implements OnInit {
  titulo = "Gestión de Logros";

  public titulos: any[] = [];
  public datos: any[] = [];
  public columnasFiltro = ['Grado', 'Área Académica', 'Corte Académico', 'Eje Curricular', 'Competencia Cognitiva', 'Esfera Desarrollo'];

  constructor(
    private router: Router,
    private logrosService: LogrosService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTodos();
  }

  obtenerTodos(): void {
    this.logrosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Consumo servicio logros", body);
        this.datos = body;
      },
      error: (error: any) => {
        console.error("Error al obtener logros", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los logros.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  eliminar(idLogro: any, nombreLogro: string): void {
    console.log("Eliminar logro ID:", idLogro);
  
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el logro: "${nombreLogro}". Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const body = { id: idLogro };
        this.logrosService.eliminar(body).subscribe({
          next: (response: any) => {
            console.log("Eliminar response", response);
            const data = response.id;
            if (data) {
              Swal.fire({
                title: 'Logro eliminado con éxito',
                icon: "info",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              }).then(() => {
                this.obtenerTodos();
              });
            } else {
              Swal.fire({
                title: 'Error al eliminar el logro',
                text: response.error || 'No se pudo eliminar el logro. Intente más tarde.',
                icon: "error",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              });
              console.log("Error al eliminar logro: No ID in response or error flag.", response);
            }
          },
          error: (err: any) => {
            console.error("Error en servicio eliminar logro", err);
            Swal.fire({
              title: 'Error',
              text: 'Ocurrió un error al intentar eliminar el logro.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else {
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  crearTitulos(): void {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre del Logro',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_grado',
        alias: 'Grado',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_area_academica',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_corte_academico',
        alias: 'Corte Académico',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_esfera_desarrollo',
        alias: 'Esfera Desarrollo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_eje_curricular',
        alias: 'Eje Curricular',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_competencia_cognitiva',
        alias: 'Competencia Cognitiva',
        alinear: 'izquierda',
      }
    ];
  }

  seleccionar(event: any): void {
    console.log("Seleccionar evento:", event);
    if (event.accion === 'editar') {
      this.router.navigate(['/academico/logros/editar/' + event.id]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro.nombre || 'Logro sin nombre'); 
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['/academico/logros/consultar/' + event.id]);
    }
  }
}