import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-datos-estudiantes',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './datos-estudiantes.component.html',
  styleUrl: './datos-estudiantes.component.scss'
})
export class DatosEstudiantesComponent {
  titulo = "Datos de Estudiantes";

  opciones = [
    { ruta: 'tipos-datos-medicos', icono: '🏥', nombre: 'Categorías Médicas', descripcion: 'Categorías para agrupar datos médicos' },
    { ruta: 'datos-medicos', icono: '💊', nombre: 'Datos Médicos', descripcion: 'Campos médicos configurables por estudiante' },
    { ruta: 'tipos-datos-adicionales', icono: '📂', nombre: 'Categorías Adicionales', descripcion: 'Categorías para agrupar datos adicionales' },
    { ruta: 'datos-adicionales', icono: '📋', nombre: 'Datos Adicionales', descripcion: 'Campos adicionales configurables por estudiante' },
  ];

  constructor(private router: Router) {}

  navegar(ruta: string) {
    this.router.navigate(['/administracion/datos-estudiantes/' + ruta]);
  }
}