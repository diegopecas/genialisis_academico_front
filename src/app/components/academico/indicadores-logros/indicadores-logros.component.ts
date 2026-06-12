import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component'; 
import { TablasComponent } from '../../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import { IndicadoresLogrosService } from '../../../services/indicadores-logros.service';

@Component({
  selector: 'app-indicadores-logros',
  templateUrl: './indicadores-logros.component.html',
  styleUrls: ['./indicadores-logros.component.scss'], 
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class IndicadoresLogrosComponent implements OnInit {
  titulo = "Gestión de Indicadores de Logro";

  public titulos: any[] = [];
  public datos: any[] = [];
  public columnasFiltro = ['Indicador', 'Logro', 'Grado', 'Área Académica', 'Corte'];

  constructor(
    private router: Router,
    private indicadoresLogrosService: IndicadoresLogrosService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerTodos();
  }

  obtenerTodos(): void {
    this.indicadoresLogrosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Consumo servicio indicadores de logro", body);
        this.datos = body;
      },
      error: (error: any) => {
        console.error("Error al obtener indicadores de logro", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los indicadores de logro.',
          icon: 'error',
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
        alias: 'Indicador de Logro',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_logro',
        alias: 'Logro',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_grado',
        alias: 'Grado',
        alinear: 'centrado',
      },
      {
        clave: 'area_academica_nombre',
        alias: 'Área Académica',
        alinear: 'izquierda',
      },
      {
        clave: 'corte_academico_nombre',
        alias: 'Corte',
        alinear: 'centrado',
      }
    ];
  }

  seleccionar(event: any): void {
    console.log("Seleccionar evento:", event);
    if (event.accion === 'editar') {
      this.router.navigate(['/academico/indicadores-logros/editar/' + event.id]);
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['/academico/indicadores-logros/consultar/' + event.id]);
    }
  }
}