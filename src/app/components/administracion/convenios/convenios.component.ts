import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ConveniosService } from '../../../services/convenios.service';


@Component({
  selector: 'app-convenios',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './convenios.component.html',
  styleUrl: './convenios.component.scss'
})
export class ConveniosComponent implements OnInit {
  titulo = 'Gestión de Convenios';
  public titulos = [] as any[];
  public datos = [] as any[];

  constructor(
    private conveniosService: ConveniosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConvenios();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'descripcion', alias: 'Descripción', alinear: 'izquierda' },
      { clave: 'nombre_producto_servicio', alias: 'Producto asociado', alinear: 'izquierda' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  obtenerConvenios() {
    this.conveniosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.datos = (body as any[]).map((c: any) => ({
          ...c,
          estado: c.activo == 1 ? 'Activo' : 'Inactivo',
          color: c.activo == 0 ? '#e2e9f3' : ''
        }));
      },
      error: (error) => {
        console.error('Error al obtener convenios:', error);
      }
    });
  }

  clicAccion($event: any) {
    if ($event.accion === 'editar') {
      this.router.navigate(['/administracion/financiero/convenios/editar/' + $event.registro.id]);
    }
  }
}