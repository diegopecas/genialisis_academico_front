import { Component, HostListener } from '@angular/core';
import { EstudiantesService } from '../../services/estudiantes.service';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../common/header/header.component';
import { TablasComponent } from '../../common/tablas/tablas.component';
import Swal from 'sweetalert2';
import { GruposService } from '../../services/grupos.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { PermisosService } from '../../services/permisos.service';
import { GradosXGrupoService } from '../../services/grados-x-grupo.service';

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
export class EstudiantesComponent {
  titulo = 'Gestión de estudiantes';
  public columnasFiltro = ['Nombre completo', 'Grupo', 'Estado', 'Permanente'];
  public titulos = [] as any[];

  public datos = [] as any[];
  public datosFiltrados = [] as any[];
  public grupos = [] as any[];

  // Variables para móvil
  public isMobile = false;
  public busquedaMovil = '';
  public filtroActivo = 'todos';
  public estudianteSeleccionado: any = null;

  public acciones = [] as any[];

  // Variables de permisos
  public puedeAdministrar = false;
  public puedeCambiarGrupo = false;

  constructor(
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
    private permisosService: PermisosService,
    private gradosXGrupoService: GradosXGrupoService
  ) {}

  ngOnInit(): void {
    this.checkDevice();
    this.configurarPermisos();
    this.crearTitulos();
    this.obtenerGrupos();
    this.obtenerEstudiantesXGrupo();
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
    this.puedeCambiarGrupo = this.permisosService.tienePermiso('estudiantes.cambio_grupo');
    // Orden inverso al deseado porque se usa unshift (el último unshift queda primero)
    if (this.permisosService.tienePermiso('estudiantes.vista_360')) {
      this.acciones.unshift({ id: 'vista_360', label: '360', icono: '/assets/images/vista_360.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.contratos')) {
      this.acciones.unshift({ id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png' });
    }
    // Cursos extracurriculares (sin permiso específico por ahora)
    this.acciones.unshift({ id: 'cursos_extra', label: 'Cursos Extra', icono: '/assets/images/cursos-extra.png' });
    if (this.permisosService.tienePermiso('estudiantes.observaciones')) {
      this.acciones.unshift({ id: 'observaciones', label: 'Observaciones', icono: '/assets/images/observaciones.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.pagos')) {
      this.acciones.unshift({ id: 'pagos', label: 'Pagos', icono: '/assets/images/pagos.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.productos_servicios')) {
      this.acciones.unshift({ id: 'productos_servicios', label: 'Productos', icono: '/assets/images/productos.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.medidas')) {
      this.acciones.unshift({ id: 'registro_medidas', label: 'Medidas', icono: '/assets/images/medidas.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.acudientes')) {
      this.acciones.unshift({ id: 'registro_acudientes', label: 'Acudientes', icono: '/assets/images/familia.png' });
    }
    if (this.puedeCambiarGrupo) {
      this.acciones.unshift({ id: 'cambiar_grupo', label: 'Cambio Grupo', icono: '/assets/images/cambio_grupo.png' });
    }
    if (this.permisosService.tienePermiso('estudiantes.onces')) {
      this.acciones.unshift({ id: 'onces', label: 'Onces', icono: '/assets/images/onces.png' });
    }
  }

  obtenerEstudiantesXGrupo() {
    this.estudiantesService.obtenerTodosXGrupo(0).subscribe((response: any) => {
      const body = response.body as any[];
      console.log('consumo servicio estudiantes', body);
      this.datos = body;
      this.datos.forEach((e: any) => {
        e.nombre_completo = `${e.primer_nombre} ${e.segundo_nombre} ${e.primer_apellido} ${e.segundo_apellido}`;
        e.color = e.activo === 0 ? '#e2e9f3' : '';
        e.estado = e.activo === 0 ? 'Inactivo' : 'Activo';
        e.alimentacion = e.alimentacion === 0 ? 'No' : 'Sí';
        e.permanente_texto = e.permanente == 1 ? 'Sí' : 'No';
      });
      this.datosFiltrados = [...this.datos];
    });
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

  // Métodos para móvil
  filtrarEstudiantes() {
    let filtrados = [...this.datos];

    if (this.busquedaMovil) {
      const busqueda = this.busquedaMovil.toLowerCase();
      filtrados = filtrados.filter(
        (e) =>
          e.nombre_completo.toLowerCase().includes(busqueda) ||
          e.nombre_grupo.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroActivo !== 'todos') {
      if (this.filtroActivo === 'activos') {
        filtrados = filtrados.filter((e) => e.activo === 1);
      } else if (this.filtroActivo === 'inactivos') {
        filtrados = filtrados.filter((e) => e.activo === 0);
      } else {
        filtrados = filtrados.filter(
          (e) => e.nombre_grupo === this.filtroActivo
        );
      }
    }

    this.datosFiltrados = filtrados;
  }

  aplicarFiltro(filtro: string) {
    this.filtroActivo = filtro;
    this.filtrarEstudiantes();
  }

  mostrarOpcionesEstudiante(estudiante: any) {
    this.estudianteSeleccionado = estudiante;

    setTimeout(() => {
      if (this.estudianteSeleccionado?.id === estudiante.id) {
        this.estudianteSeleccionado = null;
      }
    }, 5000);
  }

  ejecutarAccionMovil(accionId: string) {
    if (!this.estudianteSeleccionado) return;

    const evento = {
      accion: accionId,
      registro: this.estudianteSeleccionado,
    };

    this.clicAccion(evento);
    this.estudianteSeleccionado = null;
  }

  editarMovil(event: Event, estudiante: any) {
    event.stopPropagation();
    this.router.navigate(['estudiantes/editar/' + estudiante.id_estudiante]);
  }

  cambiarGrupoMovil(event: Event, estudiante: any) {
    event.stopPropagation();
    this.cambiarGrupo(estudiante);
  }

  buscar(event: any) {
    console.log('buscar', event);
  }

  clicAccion($event: any) {
    console.log('Acción', $event);
    switch ($event.accion) {
      case 'cambiar_grupo':
        this.cambiarGrupo($event.registro);
        break;
      case 'registro_acudientes':
        this.registroAcudientes($event.registro.id_estudiante);
        break;
      case 'registro_medidas':
        this.registroMedidas($event.registro.id_estudiante);
        break;
      case 'productos_servicios':
        this.registroProductosServicios($event.registro.id_estudiante);
        break;
      case 'pagos':
        this.registroPagos($event.registro.id_estudiante);
        break;
      case 'observaciones':
        this.registroObservaciones($event.registro.id_estudiante);
        break;
      case 'vista_360':
        this.vista_360($event.registro.id_estudiante);
        break;
      case 'editar':
        this.router.navigate([
          'estudiantes/editar/' + $event.registro.id_estudiante,
        ]);
        break;
      case 'onces':
        this.onces($event.registro.id_estudiante);
        break;
      case 'contratos':
        this.registroContratos($event.registro.id_estudiante);
        break;
      case 'cursos_extra':
        this.cursosExtra($event.registro.id_estudiante);
        break;
    }
  }

  async cambiarGrupo(registro: any) {
    const idEstudianteGrupo = registro.id;
    const idEstudiante = registro.id_estudiante;
    const nombreEstudiante = registro.nombre_completo || '';
    const grupoActual = registro.nombre_grupo || 'Sin grupo';
    const gradoActual = registro.nombre_grado || 'Sin grado';

    let opcionesGrupoHtml = '<option value="">Seleccionar</option>';
    this.grupos.forEach((g: any) => {
      opcionesGrupoHtml += `<option value="${g.id}">${g.nombre}</option>`;
    });

    const swalConfig: any = {
      title: 'Cambiar grupo',
      html: `
        <div style="text-align: center; margin-bottom: 16px; padding: 10px 0; border-bottom: 1px solid #eee;">
          <div style="font-size: 1.05rem; font-weight: 600; color: #333;">${nombreEstudiante}</div>
          <div style="font-size: 0.85rem; color: #888; margin-top: 4px;">${grupoActual} · ${gradoActual}</div>
        </div>
        <div style="text-align: left; overflow: hidden;">
          <label style="font-weight: 600; margin-bottom: 4px; display: block; font-size: 0.9rem;">Nuevo grupo</label>
          <select id="swal-grupo" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 14px; font-size: 0.95rem; display: block;">
            ${opcionesGrupoHtml}
          </select>
          <label style="font-weight: 600; margin-bottom: 4px; display: block; font-size: 0.9rem;">Nuevo grado</label>
          <select id="swal-grado" style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; display: block;" disabled>
            <option value="">Seleccione un grupo primero</option>
          </select>
        </div>
      `,
      width: 420,
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      didOpen: () => {
        const selectGrupo = document.getElementById('swal-grupo') as HTMLSelectElement;
        const selectGrado = document.getElementById('swal-grado') as HTMLSelectElement;

        selectGrupo.addEventListener('change', () => {
          const idGrupo = selectGrupo.value;
          selectGrado.innerHTML = '<option value="">Cargando...</option>';
          selectGrado.disabled = true;

          if (!idGrupo) {
            selectGrado.innerHTML = '<option value="">Seleccione un grupo primero</option>';
            return;
          }

          this.gradosXGrupoService.obtenerPorGrupo(idGrupo).subscribe({
            next: (response: any) => {
              const grados = response.body || response;
              let opcionesHtml = '<option value="">Seleccionar</option>';
              grados.forEach((g: any) => {
                opcionesHtml += `<option value="${g.id_grado}">${g.nombre_grado}</option>`;
              });
              selectGrado.innerHTML = opcionesHtml;
              selectGrado.disabled = false;

              if (grados.length === 1) {
                selectGrado.value = grados[0].id_grado.toString();
              }
            },
            error: () => {
              selectGrado.innerHTML = '<option value="">Error al cargar grados</option>';
            }
          });
        });
      },
      preConfirm: () => {
        const grupo = (document.getElementById('swal-grupo') as HTMLSelectElement).value;
        const grado = (document.getElementById('swal-grado') as HTMLSelectElement).value;

        if (!grupo) {
          Swal.showValidationMessage('Seleccione un grupo');
          return false;
        }
        if (!grado) {
          Swal.showValidationMessage('Seleccione un grado');
          return false;
        }
        return { grupo, grado };
      }
    };

    if (this.isMobile) {
      swalConfig.customClass = {
        popup: 'swal-mobile',
        title: 'swal-mobile-title',
      };
    }

    const result = await Swal.fire(swalConfig);

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const { grupo, grado } = result.value;

    this.estudiantesService
      .inactivarEstudianteGrupo(idEstudianteGrupo)
      .subscribe((response: any) => {
        console.log('inactivarEstudianteGrupo', response);
        this.estudiantesService
          .activarEstudianteGrupo(idEstudiante, grupo, this.institucionConfigService.getAnioAcademicoActual(), grado)
          .subscribe((response2: any) => {
            console.log('activarEstudianteGrupo', response2);
            Swal.fire({
              title: 'Se ha cambiado el grupo.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false,
            });
            this.obtenerEstudiantesXGrupo();
          });
      });
  }

  // Navegación
  registroMedidas(id: any) {
    this.router.navigate(['/estudiantes-medidas/' + id]);
  }

  registroProductosServicios(id: any) {
    this.router.navigate(['/estudiantes-productos-servicios/' + id]);
  }

  registroPagos(id: any) {
    this.router.navigate(['/estudiantes-pagos/' + id]);
  }

  registroObservaciones(id: any) {
    this.router.navigate(['/estudiantes-observaciones/' + id]);
  }

  registroAcudientes(id: any) {
    this.router.navigate(['/estudiantes-acudientes/' + id]);
  }

  vista_360(id: any) {
    this.router.navigate(['/estudiantes-vista/' + id]);
  }

  onces(id: any) {
    this.router.navigate(['/estudiantes-onces/' + id]);
  }
  registroContratos(id: any) {
    this.router.navigate(['/estudiantes-contratos/' + id]);
  }

  cursosExtra(id: any) {
    this.router.navigate(['/estudiantes-cursos-extra/' + id]);
  }
}