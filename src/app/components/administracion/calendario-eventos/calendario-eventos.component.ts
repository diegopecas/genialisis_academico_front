import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-calendario-eventos',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './calendario-eventos.component.html',
  styleUrl: './calendario-eventos.component.scss'
})
export class CalendarioEventosComponent implements OnInit {

  titulo = "Calendario de Eventos";

  private todasLasOpciones = [
    { id: 'tipos', nombre: 'Tipos de Evento', descripcion: 'Clasificación de los eventos con su icono', imagen: 'assets/images/tipos-evento-calendario.png', ruta: '/administracion/datos-maestros/calendario-eventos/tipos', permiso: 'admin.tipos_evento_calendario' },
    { id: 'eventos', nombre: 'Eventos', descripcion: 'Fechas del calendario que ven los padres en el portal', imagen: 'assets/images/eventos-calendario.png', ruta: '/administracion/datos-maestros/calendario-eventos/eventos', permiso: 'admin.eventos_calendario' }
  ];

  opciones: any[] = [];

  constructor(
    private router: Router,
    public permisosService: PermisosService
  ) {}

  ngOnInit(): void {
    // Solo se pintan las tarjetas a las que el usuario tiene permiso
    this.opciones = this.todasLasOpciones.filter(opcion => this.permisosService.tienePermiso(opcion.permiso));
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }
}
