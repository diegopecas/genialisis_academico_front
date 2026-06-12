import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../common/header/header.component';
import { RegistroIngresoSalidaComponent } from '../colaboradores/registro-ingreso-salida/registro-ingreso-salida.component';
import { GestionTiempoColaboradorComponent } from '../colaboradores/gestion-tiempo-colaborador/gestion-tiempo-colaborador.component';
import { ColaboradoresPagosRecibidosComponent } from '../colaboradores/pagos-recibidos/colaboradores-pagos-recibidos.component';
import { ColaboradoresPrestamosComponent } from '../colaboradores/prestamos/colaboradores-prestamos.component';
import { CrearColaboradoresComponent } from '../colaboradores/crear-colaboradores/crear-colaboradores.component';
import { ColaboradoresProductosServiciosComponent } from '../colaboradores/productos-servicios/colaboradores-productos-servicios.component';
import { SeguridadPerfilComponent } from './seguridad-perfil/seguridad-perfil.component';
import Swal from 'sweetalert2';

export type TabPerfil = 'ingreso-salida' | 'mis-datos' | 'gestion-tiempo' | 'productos-servicios' | 'pagos-recibidos' | 'prestamos' | 'seguridad';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrl: './mi-perfil.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    RegistroIngresoSalidaComponent,
    GestionTiempoColaboradorComponent,
    ColaboradoresPagosRecibidosComponent,
    ColaboradoresPrestamosComponent,
    CrearColaboradoresComponent,
    ColaboradoresProductosServiciosComponent,
    SeguridadPerfilComponent,
  ],
})
export class MiPerfilComponent implements OnInit {
  public titulo = 'Mi Perfil';
  public idColaborador = '0';
  public nombreColaborador = '';
  public tabActivo: TabPerfil = 'ingreso-salida';

  // Tabs ya visitados — se mantienen en DOM con [hidden] para no recargar
  public tabsCargados: Set<TabPerfil> = new Set(['ingreso-salida']);

  public tabs: { id: TabPerfil; label: string; icono: string }[] = [
    { id: 'ingreso-salida', label: 'Ingreso / Salida', icono: '/assets/images/asistencia.png' },
    { id: 'mis-datos', label: 'Mis Datos', icono: '/assets/images/colaboradores.png' },
    { id: 'gestion-tiempo', label: 'Gestión Tiempo', icono: '/assets/images/tiempo.png' },
    { id: 'productos-servicios', label: 'Productos / Servicios', icono: '/assets/images/productos.png' },
    { id: 'pagos-recibidos', label: 'Pagos Recibidos', icono: '/assets/images/pagos.png' },
    { id: 'prestamos', label: 'Préstamos', icono: '/assets/images/prestamos.png' },
    { id: 'seguridad', label: 'Seguridad', icono: '/assets/images/seguridad.png' },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  private cargarDatosUsuario(): void {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        this.idColaborador = String(usuario.id_colaborador || 0);
        this.nombreColaborador = [usuario.primer_nombre, usuario.primer_apellido]
          .filter(Boolean)
          .join(' ');
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }

    if (this.idColaborador === '0') {
      Swal.fire({
        icon: 'warning',
        title: 'Sin acceso',
        text: 'No se encontró un colaborador asociado a tu usuario.',
        confirmButtonColor: '#FFC107',
        confirmButtonText: 'Aceptar',
      }).then(() => {
        this.router.navigate(['/menu']);
      });
    }
  }

  cambiarTab(tab: TabPerfil): void {
    this.tabsCargados.add(tab);
    this.tabActivo = tab;
  }

  esTabActivo(tab: TabPerfil): boolean {
    return this.tabActivo === tab;
  }

  tabYaCargado(tab: TabPerfil): boolean {
    return this.tabsCargados.has(tab);
  }
}