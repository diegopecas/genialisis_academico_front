import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ElementosInventarioService } from '../../../../services/elementos-inventario.service';
import { ElementosInventarioGruposService } from '../../../../services/elementos-inventario-grupos.service';
import { GruposService } from '../../../../services/grupos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-elemento-inventario',
  templateUrl: './crear-elemento-inventario.component.html',
  styleUrl: './crear-elemento-inventario.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearElementoInventarioComponent implements OnInit {

  titulo = "Crear Elemento de Inventario";
  accion: string = "";
  regresar = '/administracion/operaciones/elementos-inventario';
  editable: boolean = true;
  submitted: boolean = false;

  public grupos = [] as any[];
  // Ids de los grupos marcados. Vacío significa que el elemento aplica a
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
    private elementosInventarioService: ElementosInventarioService,
    private elementosInventarioGruposService: ElementosInventarioGruposService,
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
        this.titulo = "Crear Elemento de Inventario";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Elemento de Inventario";
        this.editable = true;
        this.cargarRegistro(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Elemento de Inventario";
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
    this.elementosInventarioService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          this.titulo = (this.accion === 'editar' ? "Editar" : "Consultar") + " Elemento: " + this.model.nombre;
          this.cargarGruposElemento(id);
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el registro', 'error');
      }
    });
  }

  cargarGruposElemento(id: any) {
    this.elementosInventarioGruposService.obtenerPorElemento(id).subscribe({
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
      this.elementosInventarioService.crear(data).subscribe({
        next: (respuesta: any) => {
          const idNuevo = respuesta?.id;
          this.guardarGrupos(idNuevo, 'Elemento creado correctamente');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo crear el elemento';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.elementosInventarioService.actualizar(data).subscribe({
        next: () => {
          this.guardarGrupos(this.model.id, 'Elemento actualizado correctamente');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo actualizar el elemento';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }

  // Los grupos se graban en una segunda llamada, mandando la lista completa.
  // Si el elemento aplica a todos, la lista va vacía.
  private guardarGrupos(idElemento: any, mensajeExito: string) {
    if (!idElemento) {
      Swal.fire('Éxito', mensajeExito, 'success');
      this.router.navigate([this.regresar]);
      return;
    }

    const grupos = this.aplicaATodos ? [] : this.gruposSeleccionados;

    this.elementosInventarioGruposService.reemplazarGruposElemento(idElemento, grupos).subscribe({
      next: () => {
        Swal.fire('Éxito', mensajeExito, 'success');
        this.router.navigate([this.regresar]);
      },
      error: () => {
        Swal.fire('Atención', 'El elemento se guardó, pero no se pudieron guardar los grupos.', 'warning');
        this.router.navigate([this.regresar]);
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
