import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ColaboradoresService } from '../../services/colaboradores.service';
import { RolesColaboradorService } from '../../services/roles-colaborador.service';
import { CasasColaboradoresService } from '../../services/casas-colaboradores.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../common/header/header.component';
import { TablasComponent } from '../../common/tablas/tablas.component';

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

  // Opciones de los selects
  public roles = [] as any[];
  public casas = [] as any[];

  // Filtros que se envían al backend
  public filtroRol = '';
  public filtroCasa = '';
  public filtroEstado = '';
  public filtroNombre = '';

  public busquedaRealizada = false;
  public cargando = false;

  // Única acción personalizada: abre el hub de opciones del colaborador.
  public acciones = [
    { id: 'opciones', label: 'Opciones', icono: '/assets/images/opciones.png' }
  ] as any[];

  constructor(
    private colaboradoresService: ColaboradoresService,
    private rolesService: RolesColaboradorService,
    private casasService: CasasColaboradoresService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerRoles();
    this.obtenerCasas();
  }

  obtenerRoles() {
    this.rolesService.obtenerTodos().subscribe({
      next: (r: any) => (this.roles = r.body || []),
      error: (e: any) => console.error('Error al obtener roles:', e)
    });
  }

  obtenerCasas() {
    this.casasService.obtenerTodos().subscribe({
      next: (r: any) => (this.casas = r.body || []),
      error: (e: any) => console.error('Error al obtener casas:', e)
    });
  }

  // Consulta al backend con los filtros actuales. Sin filtros => trae todos.
  buscar() {
    this.cargando = true;

    const filtros = {
      id_rol: this.filtroRol,
      id_casa: this.filtroCasa,
      estado: this.filtroEstado,
      nombre: (this.filtroNombre || '').trim(),
    };

    this.colaboradoresService.obtenerPorFiltros(filtros).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.datos = (body || []).map(colaborador => ({
          ...colaborador,
          color: colaborador.activo === 0 ? "#e2e9f3" : "",
          estado: colaborador.activo === 0 ? "Inactivo" : "Activo"
        }));
        this.busquedaRealizada = true;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar colaboradores:', error);
        this.datos = [];
        this.busquedaRealizada = true;
        this.cargando = false;
      }
    });
  }

  limpiar() {
    this.filtroRol = '';
    this.filtroCasa = '';
    this.filtroEstado = '';
    this.filtroNombre = '';
    this.datos = [];
    this.busquedaRealizada = false;
  }

  accionTabla(event: any) {
    switch (event.accion) {
      case 'editar':
        this.router.navigate(['/colaboradores/editar/' + event.id]);
        break;
      case 'opciones':
        this.router.navigate(['/colaboradores-opciones/' + event.id], {
          state: { registro: event.registro }
        });
        break;
    }
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
}
