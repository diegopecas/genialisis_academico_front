import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { PermisosService } from '../../../services/permisos.service';
import { OpcionesColaboradorService, OpcionColaborador } from '../../../services/opciones-colaborador.service';

interface CategoriaOpciones {
  nombre: string;
  opciones: OpcionColaborador[];
}

@Component({
  selector: 'app-opciones-colaborador',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HeaderComponent],
  templateUrl: './opciones-colaborador.component.html',
  styleUrl: './opciones-colaborador.component.scss',
})
export class OpcionesColaboradorComponent implements OnInit {
  public titulo = 'Opciones del colaborador';
  public idColaborador = '';

  public registro: any = null;
  public nombreColaborador = '';

  // Registro recibido desde el listado por router state (evita re-consultar)
  private registroDesdeState: any = null;

  public categorias: CategoriaOpciones[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradoresService: ColaboradoresService,
    private permisosService: PermisosService,
    private opcionesColaboradorService: OpcionesColaboradorService
  ) {
    const nav = this.router.getCurrentNavigation();
    const estado: any = nav?.extras?.state;
    this.registroDesdeState = estado && estado.registro ? estado.registro : null;
  }

  ngOnInit(): void {
    this.configurarOpciones();
    this.route.params.subscribe((params) => {
      this.idColaborador = params['id'];
      this.cargarRegistro();
    });
  }

  /**
   * Las opciones salen del mismo catálogo que usa el buscador del menú, para
   * que una opción nueva aparezca en los dos lados.
   */
  configurarOpciones(): void {
    const opciones = this.opcionesColaboradorService.getOpciones();
    this.categorias = this.opcionesColaboradorService.getOrdenCategorias()
      .map((nombre) => ({
        nombre,
        opciones: opciones.filter(
          (o) =>
            o.categoria === nombre &&
            (o.permiso === null || this.permisosService.tienePermiso(o.permiso))
        ),
      }))
      .filter((c) => c.opciones.length > 0);
  }

  // 1) state de la navegación  2) backend (refresh/URL directa)
  cargarRegistro() {
    if (this.registroDesdeState) {
      this.registro = this.registroDesdeState;
      this.aplicarContexto(this.registro);
      return;
    }

    this.colaboradoresService.obtenerById(this.idColaborador).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.registro = body && body.length > 0 ? body[0] : null;
        if (this.registro) {
          this.aplicarContexto(this.registro);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el colaborador:', error);
        this.registro = null;
      },
    });
  }

  private aplicarContexto(registro: any) {
    this.nombreColaborador =
      registro.nombre_completo ||
      `${registro.primer_nombre || ''} ${registro.primer_apellido || ''}`.replace(/\s+/g, ' ').trim();
    if (this.nombreColaborador) {
      this.titulo = this.nombreColaborador;
    }
  }

  ejecutar(opcion: OpcionColaborador) {
    if (opcion.ruta) {
      this.router.navigate([opcion.ruta + this.idColaborador]);
      return;
    }

    if (opcion.id === 'eliminar') {
      this.eliminar();
    }
  }

  eliminar() {
    const nombre = this.nombreColaborador || 'este colaborador';

    Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el colaborador ${nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.colaboradoresService.eliminar(this.idColaborador).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Eliminado',
              text: 'El colaborador ha sido eliminado correctamente',
              timer: 2000,
              showConfirmButton: false
            }).then(() => this.router.navigate(['/colaboradores']));
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.error || 'No se pudo eliminar el colaborador'
            });
          }
        });
      }
    });
  }
}