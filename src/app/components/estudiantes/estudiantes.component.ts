import { Component, HostListener, OnInit } from '@angular/core';
import { EstudiantesService } from '../../services/estudiantes.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../common/header/header.component';
import { TablasComponent } from '../../common/tablas/tablas.component';
import { GruposService } from '../../services/grupos.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PermisosService } from '../../services/permisos.service';

@Component({
  selector: 'app-estudiantes',
  templateUrl: './estudiantes.component.html',
  styleUrl: './estudiantes.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    TablasComponent,
    RouterModule,
    FormsModule,
  ],
})
export class EstudiantesComponent implements OnInit {
  titulo = 'Gestión de estudiantes';
  public titulos = [] as any[];

  public datos = [] as any[];
  public grupos = [] as any[];

  // Filtros que se envían al backend
  public filtroGrupo = '';
  public filtroEstado = '';
  public filtroPermanente = '';
  public filtroNombre = '';

  // Estado de la búsqueda
  public busquedaRealizada = false;
  public cargando = false;

  // Variables para móvil
  public isMobile = false;

  // Única acción personalizada: abre el hub de opciones del estudiante.
  public acciones = [
    { id: 'opciones', label: 'Opciones', icono: '/assets/images/opciones.png' },
  ];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private router: Router,
    private permisosService: PermisosService
  ) {}

  ngOnInit(): void {
    this.checkDevice();
    this.configurarPermisos();
    this.crearTitulos();
    this.obtenerGrupos();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkDevice();
  }

  checkDevice() {
    this.isMobile = window.innerWidth <= 768;
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.administrar');
  }

  obtenerGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.grupos = body;
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
        clave: 'nombre_grupo',
        alias: 'Grupo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_completo',
        alias: 'Nombre completo',
        alinear: 'izquierda',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'permanente_texto',
        alias: 'Permanente',
        alinear: 'centrado',
      },
    ];
  }

  // Lanza la consulta al backend con los filtros actuales. Sin filtros => trae todos.
  buscar() {
    this.cargando = true;

    const filtros = {
      id_grupo: this.filtroGrupo,
      estado: this.filtroEstado,
      permanente: this.filtroPermanente,
      nombre: (this.filtroNombre || '').trim(),
    };

    this.estudiantesService.obtenerPorFiltros(filtros).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.mapearDatos(body);
        this.busquedaRealizada = true;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al obtener estudiantes:', error);
        this.datos = [];
        this.busquedaRealizada = true;
        this.cargando = false;
      },
    });
  }

  limpiar() {
    this.filtroGrupo = '';
    this.filtroEstado = '';
    this.filtroPermanente = '';
    this.filtroNombre = '';
    this.datos = [];
    this.busquedaRealizada = false;
  }

  private mapearDatos(body: any[]) {
    this.datos = body || [];
    this.datos.forEach((e: any) => {
      e.nombre_completo = `${e.primer_nombre} ${e.segundo_nombre} ${e.primer_apellido} ${e.segundo_apellido}`;
      e.color = e.activo === 0 ? '#e2e9f3' : '';
      e.estado = e.activo === 0 ? 'Inactivo' : 'Activo';
      e.alimentacion = e.alimentacion === 0 ? 'No' : 'Sí';
      e.permanente_texto = e.permanente == 1 ? 'Sí' : 'No';
    });
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['estudiantes/editar/' + $event.registro.id_estudiante]);
        break;
      case 'opciones':
        this.irAOpciones($event.registro);
        break;
    }
  }

  editarMovil(event: Event, estudiante: any) {
    event.stopPropagation();
    this.router.navigate(['estudiantes/editar/' + estudiante.id_estudiante]);
  }

  opcionesMovil(event: Event, estudiante: any) {
    event.stopPropagation();
    this.irAOpciones(estudiante);
  }

  // Navega al hub pasando el registro completo de la fila para evitar una nueva
  // consulta. En refresh directo el hub usa su propio fallback.
  private irAOpciones(registro: any) {
    this.router.navigate(['/estudiantes-opciones/' + registro.id_estudiante], {
      state: { registro },
    });
  }
}
