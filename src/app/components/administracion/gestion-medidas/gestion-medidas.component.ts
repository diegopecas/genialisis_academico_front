import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';

@Component({
  selector: 'app-gestion-medidas',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './gestion-medidas.component.html',
  styleUrl: './gestion-medidas.component.scss'
})
export class GestionMedidasComponent {

  titulo = "Gestión de Medidas Corporales";

  opciones = [
    { id: 'categorias', nombre: 'Categorías', descripcion: 'Agrupa las medidas por tipo', icono: 'fas fa-folder-open', imagen: 'assets/images/categorias-medidas.png', ruta: '/administracion/gestion-medidas/categorias' },
    { id: 'unidades', nombre: 'Unidades de Medida', descripcion: 'Unidades como kg, cm, %, etc.', icono: 'fas fa-balance-scale', imagen: 'assets/images/unidades-medidas.png', ruta: '/administracion/gestion-medidas/unidades' },
    { id: 'medidas', nombre: 'Medidas', descripcion: 'Catálogo de medidas corporales', icono: 'fas fa-weight', imagen: 'assets/images/medidas-catalogo.png', ruta: '/administracion/gestion-medidas/medidas' }
  ];

  constructor(private router: Router) {}

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }
}