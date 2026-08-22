import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocentesXGruposService } from '../../../../services/docentes-x-grupos.service';
import { DocentesService } from '../../../../services/docentes.service';
import { AreaAcademicaXGrupoService } from '../../../../services/area-academica-x-grupo.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-grupo-docentes',
  templateUrl: './grupo-docentes.component.html',
  styleUrl: './grupo-docentes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GrupoDocentesComponent implements OnInit, OnChanges {

  @Input() idGrupo: any;
  @Input() editable: boolean = true;

  // Docentes asignados al grupo. El titular viene de primero.
  public asignados = [] as any[];

  // Candidatos: los colaboradores con rol DOCENTE. La tabla `docentes` se
  // alimenta sola cuando a un colaborador se le pone ese rol, asi que es
  // justo la lista que se necesita.
  public docentes = [] as any[];

  // Areas ya asociadas al grupo. El area por docente se guarda en
  // area_academica_x_grupo.id_docente, que ya existe.
  public areas = [] as any[];

  public nuevoDocente: any = null;
  public cargando: boolean = false;

  constructor(
    private docentesXGruposService: DocentesXGruposService,
    private docentesService: DocentesService,
    private areaXGrupoService: AreaAcademicaXGrupoService
  ) { }

  ngOnInit(): void {
    this.cargarDocentes();

    if (this.idGrupo) {
      this.cargarAsignados();
      this.cargarAreas();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idGrupo'] && !changes['idGrupo'].firstChange && this.idGrupo) {
      this.cargarAsignados();
      this.cargarAreas();
    }
  }

  cargarDocentes() {
    this.docentesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.docentes = body.filter(d => Number(d.activo) === 1);
      },
      error: () => {
        this.docentes = [];
      }
    });
  }

  cargarAsignados() {
    this.cargando = true;
    this.docentesXGruposService.obtenerPorGrupo(this.idGrupo).subscribe({
      next: (response: any) => {
        this.asignados = (response.body as any[]) || [];
        this.cargando = false;
      },
      error: () => {
        this.asignados = [];
        this.cargando = false;
      }
    });
  }

  cargarAreas() {
    this.areaXGrupoService.obtenerPorGrupo(this.idGrupo).subscribe({
      next: (response: any) => {
        this.areas = (response.body as any[]) || [];
      },
      error: () => {
        this.areas = [];
      }
    });
  }

  /**
   * Docentes que todavia no estan en el grupo. Es lo que alimenta el
   * selector de agregar.
   */
  get docentesDisponibles(): any[] {
    const yaEstan = this.asignados.map(a => a.id_docente);
    return this.docentes.filter(d => !yaEstan.includes(d.id));
  }

  /**
   * Areas del grupo que puede escoger este docente: las que no tienen
   * docente asignado, mas la que ya tenga el propio docente.
   *
   * area_academica_x_grupo guarda un solo id_docente por area y grupo, asi
   * que si se ofrecieran las ocupadas, escogerla se la quitaria a la otra
   * docente sin que nadie se entere.
   */
  areasDisponiblesPara(asignado: any): any[] {
    return this.areas.filter(a =>
      !a.id_docente || a.id_docente === asignado.id_docente
    );
  }

  /**
   * Area que hoy dicta este docente en el grupo, o null si no tiene.
   * Un docente sin area es normal: la coordinadora, una auxiliar.
   */
  areaDe(asignado: any): any {
    return this.areas.find(a => a.id_docente === asignado.id_docente) || null;
  }

  idAreaDe(asignado: any): any {
    const area = this.areaDe(asignado);
    return area ? area.id : null;
  }

  agregarDocente() {
    if (!this.nuevoDocente) {
      Swal.fire('Advertencia', 'Escoja un docente', 'warning');
      return;
    }

    this.docentesXGruposService.crear({
      id_docente: this.nuevoDocente,
      id_grupo: this.idGrupo,
      // El primero que entra al grupo queda de titular: es lo que casi
      // siempre se quiere y evita que el grupo se quede sin titular.
      es_titular: this.asignados.length === 0 ? 1 : 0
    }).subscribe({
      next: () => {
        this.nuevoDocente = null;
        this.cargarAsignados();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo agregar el docente', 'error');
      }
    });
  }

  marcarTitular(asignado: any) {
    if (Number(asignado.es_titular) === 1) {
      return;
    }

    this.docentesXGruposService.actualizarTitular(asignado.id, 1).subscribe({
      next: () => {
        this.cargarAsignados();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo cambiar el titular', 'error');
      }
    });
  }

  async quitarDocente(asignado: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea quitar a ${asignado.nombre_docente} de este grupo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.docentesXGruposService.desactivar(asignado.id).subscribe({
      next: () => {
        this.cargarAsignados();
        this.cargarAreas();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo quitar el docente', 'error');
      }
    });
  }

  /**
   * Asigna o quita el area del docente.
   *
   * Primero libera la que tenia, si cambio de area, y despues asigna la
   * nueva. El valor vacio deja el area sin docente.
   */
  cambiarArea(asignado: any, idAreaGrupo: any) {
    const areaActual = this.areaDe(asignado);

    const asignarNueva = () => {
      if (!idAreaGrupo) {
        this.cargarAreas();
        return;
      }

      this.areaXGrupoService.actualizarDocente(idAreaGrupo, asignado.id_docente).subscribe({
        next: () => {
          this.cargarAreas();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo asignar el área', 'error');
          this.cargarAreas();
        }
      });
    };

    if (areaActual && areaActual.id !== idAreaGrupo) {
      this.areaXGrupoService.actualizarDocente(areaActual.id, null).subscribe({
        next: () => asignarNueva(),
        error: () => asignarNueva()
      });
      return;
    }

    asignarNueva();
  }

  get areasSinDocente(): any[] {
    return this.areas.filter(a => !a.id_docente);
  }
}
