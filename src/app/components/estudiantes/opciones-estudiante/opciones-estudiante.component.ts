import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { GruposService } from '../../../services/grupos.service';
import { GradosXGrupoService } from '../../../services/grados-x-grupo.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PermisosService } from '../../../services/permisos.service';

interface OpcionEstudiante {
  id: string;
  label: string;
  icono: string;
  categoria: string;
  permiso: string | null; // null => visible para todos
  ruta: string | null;    // null => acción en sitio (ej. cambio de grupo)
}

interface CategoriaOpciones {
  nombre: string;
  opciones: OpcionEstudiante[];
}

@Component({
  selector: 'app-opciones-estudiante',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './opciones-estudiante.component.html',
  styleUrl: './opciones-estudiante.component.scss',
})
export class OpcionesEstudianteComponent implements OnInit {
  public titulo = 'Opciones del estudiante';
  public idEstudiante = '';

  // Registro del grupo activo del estudiante (necesario para el cambio de grupo)
  public registro: any = null;
  public nombreEstudiante = '';
  public grupoActual = '';
  public gradoActual = '';

  // Los grupos solo se necesitan para el modal de cambio de grupo; se cargan bajo demanda.
  public grupos = [] as any[];
  public isMobile = false;

  // Registro recibido desde el listado por router state (evita re-consultar)
  private registroDesdeState: any = null;

  // Catálogo completo de opciones, agrupado por categoría.
  private opciones: OpcionEstudiante[] = [
    { id: 'vista_360', label: 'Vista 360', icono: '/assets/images/vista_360.png', categoria: 'Información', permiso: 'estudiantes.vista_360', ruta: '/estudiantes-vista/' },
    { id: 'registro_acudientes', label: 'Acudientes', icono: '/assets/images/familia.png', categoria: 'Información', permiso: 'estudiantes.acudientes', ruta: '/estudiantes-acudientes/' },
    { id: 'registro_medidas', label: 'Medidas', icono: '/assets/images/medidas.png', categoria: 'Información', permiso: 'estudiantes.medidas', ruta: '/estudiantes-medidas/' },
    { id: 'observaciones', label: 'Observaciones', icono: '/assets/images/observaciones.png', categoria: 'Información', permiso: 'estudiantes.observaciones', ruta: '/estudiantes-observaciones/' },
    { id: 'pagos', label: 'Pagos', icono: '/assets/images/pagos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.pagos', ruta: '/estudiantes-pagos/' },
    { id: 'productos_servicios', label: 'Productos', icono: '/assets/images/productos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.productos_servicios', ruta: '/estudiantes-productos-servicios/' },
    { id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.contratos', ruta: '/estudiantes-contratos/' },
    { id: 'cursos_extra', label: 'Cursos Extra', icono: '/assets/images/cursos-extra.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/estudiantes-cursos-extra/' },
    { id: 'onces', label: 'Onces', icono: '/assets/images/onces.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.onces', ruta: '/estudiantes-onces/' },
    { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png', categoria: 'Gestión', permiso: 'estudiantes.administrar', ruta: 'estudiantes/editar/' },
    { id: 'cambiar_grupo', label: 'Cambio Grupo', icono: '/assets/images/cambio_grupo.png', categoria: 'Gestión', permiso: 'estudiantes.cambio_grupo', ruta: null },
  ];

  // Orden de presentación de las categorías
  private ordenCategorias = ['Información', 'Servicios y cobros', 'Gestión'];

  public categorias: CategoriaOpciones[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private gradosXGrupoService: GradosXGrupoService,
    private institucionConfigService: InstitucionConfigService,
    private permisosService: PermisosService
  ) {
    // El registro enviado por el listado viaja en el state de la navegación.
    // Debe leerse con getCurrentNavigation() en el constructor; history.state
    // aún no está disponible en este punto.
    const nav = this.router.getCurrentNavigation();
    const estado: any = nav?.extras?.state;
    this.registroDesdeState = estado && estado.registro ? estado.registro : null;
  }

  ngOnInit(): void {
    this.checkDevice();
    this.configurarOpciones();
    this.route.params.subscribe((params) => {
      this.idEstudiante = params['id'];
      this.cargarRegistro();
    });
  }

  checkDevice() {
    this.isMobile = window.innerWidth <= 768;
  }

  configurarOpciones(): void {
    this.categorias = this.ordenCategorias
      .map((nombre) => ({
        nombre,
        opciones: this.opciones.filter(
          (o) =>
            o.categoria === nombre &&
            (o.permiso === null || this.permisosService.tienePermiso(o.permiso))
        ),
      }))
      .filter((c) => c.opciones.length > 0);
  }

  // Si el listado envió el registro por state, se usa directamente (sin consulta).
  // En refresh directo (state vacío) se consulta como fallback.
  cargarRegistro() {
    if (this.registroDesdeState) {
      this.registro = this.registroDesdeState;
      this.aplicarContexto(this.registro);
      return;
    }

    this.estudiantesService.obtenerGrupoByEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.registro = body && body.length > 0 ? body[0] : null;
        if (this.registro) {
          this.aplicarContexto(this.registro);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el grupo del estudiante:', error);
        this.registro = null;
      },
    });
  }

  private aplicarContexto(registro: any) {
    this.nombreEstudiante =
      registro.nombre_completo ||
      `${registro.primer_nombre || ''} ${registro.segundo_nombre || ''} ${registro.primer_apellido || ''} ${registro.segundo_apellido || ''}`
        .replace(/\s+/g, ' ')
        .trim();
    this.grupoActual = registro.nombre_grupo || 'Sin grupo';
    this.gradoActual = registro.nombre_grado || 'Sin grado';
    // El nombre se muestra en el encabezado (como en crear-estudiante).
    if (this.nombreEstudiante) {
      this.titulo = this.nombreEstudiante;
    }
  }

  // Carga los grupos solo si aún no se tienen (se usa al abrir el cambio de grupo).
  private asegurarGrupos(): Promise<void> {
    return new Promise((resolve) => {
      if (this.grupos.length > 0) {
        resolve();
        return;
      }
      this.gruposService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.grupos = response.body as any[];
          resolve();
        },
        error: () => resolve(),
      });
    });
  }

  ejecutar(opcion: OpcionEstudiante) {
    if (opcion.ruta) {
      this.router.navigate([opcion.ruta + this.idEstudiante]);
      return;
    }

    if (opcion.id === 'cambiar_grupo') {
      this.cambiarGrupo();
    }
  }

  async cambiarGrupo() {
    if (!this.registro) {
      Swal.fire('Sin grupo activo', 'El estudiante no tiene un grupo activo para cambiar.', 'info');
      return;
    }

    await this.asegurarGrupos();

    const idEstudianteGrupo = this.registro.id;
    const idEstudiante = this.registro.id_estudiante;

    let opcionesGrupoHtml = '<option value="">Seleccionar</option>';
    this.grupos.forEach((g: any) => {
      opcionesGrupoHtml += `<option value="${g.id}">${g.nombre}</option>`;
    });

    const swalConfig: any = {
      title: 'Cambiar grupo',
      html: `
        <div style="text-align: center; margin-bottom: 16px; padding: 10px 0; border-bottom: 1px solid #eee;">
          <div style="font-size: 1.05rem; font-weight: 600; color: #333;">${this.nombreEstudiante}</div>
          <div style="font-size: 0.85rem; color: #888; margin-top: 4px;">${this.grupoActual} · ${this.gradoActual}</div>
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
            // Tras el cambio el registro previo cambió; se refresca desde backend.
            this.registroDesdeState = null;
            this.cargarRegistro();
          });
      });
  }
}