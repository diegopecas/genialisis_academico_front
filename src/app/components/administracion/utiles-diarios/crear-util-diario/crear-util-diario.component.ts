import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { UtilesDiariosService } from '../../../../services/utiles-diarios.service';
import { UtilesDiariosGruposService } from '../../../../services/utiles-diarios-grupos.service';
import { GruposService } from '../../../../services/grupos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-util-diario',
  templateUrl: './crear-util-diario.component.html',
  styleUrl: './crear-util-diario.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearUtilDiarioComponent implements OnInit {

  titulo = "Crear Útil o Accesorio";
  accion: string = "";
  regresar = '/administracion/operaciones/utiles-diarios';
  editable: boolean = true;
  submitted: boolean = false;

  public grupos = [] as any[];
  // Ids de los grupos marcados. Vacío significa que el útil aplica a
  // todos los grupos, que es la convención del módulo.
  public gruposSeleccionados = [] as any[];
  public aplicaATodos: boolean = true;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    icono: '',
    orden: 0,
    activo: 1
  } as any;

  constructor(
    private utilesDiariosService: UtilesDiariosService,
    private utilesDiariosGruposService: UtilesDiariosGruposService,
    private gruposService: GruposService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.consultaGrupos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Útil o Accesorio";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Útil o Accesorio";
        this.editable = true;
        this.cargarRegistro(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Útil o Accesorio";
        this.editable = false;
        this.cargarRegistro(id);
      }
    });
  }

  consultaGrupos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = (response.body as any[]) || [];
      },
      error: () => {
        this.grupos = [];
      }
    });
  }

  cargarRegistro(id: any) {
    this.utilesDiariosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          this.titulo = (this.accion === 'editar' ? "Editar" : "Consultar") + " Útil: " + this.model.nombre;
          this.cargarGruposUtil(id);
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el registro', 'error');
      }
    });
  }

  cargarGruposUtil(id: any) {
    this.utilesDiariosGruposService.obtenerPorUtil(id).subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.gruposSeleccionados = body.map((g: any) => g.id_grupo);
        this.aplicaATodos = this.gruposSeleccionados.length === 0;
      },
      error: () => {
        this.gruposSeleccionados = [];
        this.aplicaATodos = true;
      }
    });
  }

  cambiarAplicaATodos() {
    if (this.aplicaATodos) {
      this.gruposSeleccionados = [];
    }
  }

  estaSeleccionado(idGrupo: any): boolean {
    return this.gruposSeleccionados.indexOf(idGrupo) >= 0;
  }

  alternarGrupo(idGrupo: any) {
    if (!this.editable) return;

    const indice = this.gruposSeleccionados.indexOf(idGrupo);
    if (indice >= 0) {
      this.gruposSeleccionados.splice(indice, 1);
    } else {
      this.gruposSeleccionados.push(idGrupo);
    }
    this.aplicaATodos = this.gruposSeleccionados.length === 0;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion || null,
      icono: this.model.icono || null,
      orden: this.model.orden || 0,
      activo: this.model.activo ?? 1
    } as any;

    if (this.accion === 'crear') {
      this.utilesDiariosService.crear(data).subscribe({
        next: (respuesta: any) => {
          const idNuevo = respuesta?.id;
          this.guardarGrupos(idNuevo, 'Útil creado correctamente');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo crear el útil';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.utilesDiariosService.actualizar(data).subscribe({
        next: () => {
          this.guardarGrupos(this.model.id, 'Útil actualizado correctamente');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo actualizar el útil';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }

  // Los grupos se graban en una segunda llamada, mandando la lista completa.
  // Si el útil aplica a todos, la lista va vacía.
  private guardarGrupos(idUtil: any, mensajeExito: string) {
    if (!idUtil) {
      Swal.fire('Éxito', mensajeExito, 'success');
      this.router.navigate([this.regresar]);
      return;
    }

    const grupos = this.aplicaATodos ? [] : this.gruposSeleccionados;

    this.utilesDiariosGruposService.reemplazarGruposUtil(idUtil, grupos).subscribe({
      next: () => {
        Swal.fire('Éxito', mensajeExito, 'success');
        this.router.navigate([this.regresar]);
      },
      error: () => {
        Swal.fire('Atención', 'El útil se guardó, pero no se pudieron guardar los grupos.', 'warning');
        this.router.navigate([this.regresar]);
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
