import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { EnlacesAutoregistroAcudientesService } from '../../../../services/enlaces-autoregistro-acudientes.service';
import { EnlacesAutoregistroEstudiantesService } from '../../../../services/enlaces-autoregistro-estudiantes.service';
import { GruposService } from '../../../../services/grupos.service';

interface EstudianteGrupo {
  id_estudiante: string;
  id_grupo: string;
  nombre_grupo: string;
  nombre_estudiante: string;
}

interface BloqueGrupo {
  id_grupo: string;
  nombre_grupo: string;
  estudiantes: EstudianteGrupo[];
}

/**
 * Crear / editar un enlace de autoregistro.
 * Los grupos solo filtran la lista: lo que se guarda son los estudiantes marcados.
 */
@Component({
  selector: 'app-crear-enlace-autoregistro',
  templateUrl: './crear-enlace-autoregistro.component.html',
  styleUrl: './crear-enlace-autoregistro.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearEnlaceAutoregistroComponent implements OnInit {

  titulo = 'Crear Enlace de Autoregistro';
  accion = '';
  regresar = '/estudiantes/enlaces-autoregistro';
  editable = true;
  submitted = false;
  guardando = false;

  public grupos = [] as any[];
  public gruposSeleccionados: string[] = [];
  public estudiantes: EstudianteGrupo[] = [];
  public bloques: BloqueGrupo[] = [];
  public seleccionados = new Set<string>();
  public busqueda = '';
  // Datos del enlace guardado (url, estado, vencimiento) para compartirlo
  public enlaceGuardado: any = null;

  model = {
    id: null,
    nombre: '',
    fecha_vencimiento: '',
    activo: 1
  } as any;

  constructor(
    private enlacesService: EnlacesAutoregistroAcudientesService,
    private enlacesEstudiantesService: EnlacesAutoregistroEstudiantesService,
    private gruposService: GruposService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.consultarGrupos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Enlace de Autoregistro';
        this.editable = true;
        this.model.fecha_vencimiento = this.finDelDia();
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Enlace de Autoregistro';
        this.editable = true;
        this.cargarRegistro(id);
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Enlace de Autoregistro';
        this.editable = false;
        this.cargarRegistro(id);
      }
    });
  }

  /** Propuesta de vencimiento: hoy a las 11:59 p. m., en formato datetime-local. */
  private finDelDia(): string {
    const hoy = new Date();
    const aa = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${aa}-${mm}-${dd}T23:59`;
  }

  consultarGrupos() {
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
    this.enlacesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.enlaceGuardado = body[0];
          this.model = {
            ...body[0],
            fecha_vencimiento: (body[0].fecha_vencimiento || '').substring(0, 16).replace(' ', 'T')
          };
          this.titulo = (this.accion === 'editar' ? 'Editar' : 'Consultar') + ' Enlace: ' + this.model.nombre;
          this.cargarEstudiantesEnlace(id);
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el enlace', 'error');
      }
    });
  }

  /** Marca los grupos actuales de los estudiantes guardados y deja marcados solo esos estudiantes. */
  cargarEstudiantesEnlace(id: any) {
    this.enlacesEstudiantesService.obtenerPorEnlace(id).subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.seleccionados = new Set(body.map((e: any) => e.id_estudiante));
        this.gruposSeleccionados = Array.from(new Set(
          body.filter((e: any) => !!e.id_grupo).map((e: any) => e.id_grupo as string)
        ));
        this.consultarEstudiantes(false);
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los estudiantes del enlace', 'error');
      }
    });
  }

  estaGrupoSeleccionado(idGrupo: string): boolean {
    return this.gruposSeleccionados.includes(idGrupo);
  }

  alternarGrupo(idGrupo: string) {
    if (!this.editable) return;

    if (this.estaGrupoSeleccionado(idGrupo)) {
      this.gruposSeleccionados = this.gruposSeleccionados.filter(g => g !== idGrupo);
      // Los estudiantes de un grupo desmarcado salen de la selección.
      this.estudiantes
        .filter(e => e.id_grupo === idGrupo)
        .forEach(e => this.seleccionados.delete(e.id_estudiante));
      this.estudiantes = this.estudiantes.filter(e => e.id_grupo !== idGrupo);
      this.armarBloques();
    } else {
      this.gruposSeleccionados = [...this.gruposSeleccionados, idGrupo];
      this.consultarEstudiantes(true, idGrupo);
    }
  }

  /**
   * Trae los estudiantes de los grupos marcados.
   * @param marcar si es true, los estudiantes de idGrupoNuevo quedan marcados.
   */
  consultarEstudiantes(marcar: boolean, idGrupoNuevo: string | null = null) {
    if (this.gruposSeleccionados.length === 0) {
      this.estudiantes = [];
      this.armarBloques();
      return;
    }

    this.enlacesService.obtenerEstudiantesPorGrupos(this.gruposSeleccionados).subscribe({
      next: (respuesta: any) => {
        this.estudiantes = (respuesta as EstudianteGrupo[]) || [];
        if (marcar && idGrupoNuevo) {
          this.estudiantes
            .filter(e => e.id_grupo === idGrupoNuevo)
            .forEach(e => this.seleccionados.add(e.id_estudiante));
        }
        this.armarBloques();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudieron consultar los estudiantes', 'error');
      }
    });
  }

  armarBloques() {
    const termino = this.normalizar(this.busqueda);
    const bloques: BloqueGrupo[] = [];

    for (const idGrupo of this.gruposSeleccionados) {
      const grupo = this.grupos.find(g => g.id === idGrupo);
      const estudiantes = this.estudiantes
        .filter(e => e.id_grupo === idGrupo)
        .filter(e => !termino || this.normalizar(e.nombre_estudiante).includes(termino));

      bloques.push({
        id_grupo: idGrupo,
        nombre_grupo: grupo ? grupo.nombre : (estudiantes[0]?.nombre_grupo || ''),
        estudiantes
      });
    }

    this.bloques = bloques;
  }

  private normalizar(texto: string): string {
    return (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  alternarEstudiante(idEstudiante: string) {
    if (!this.editable) return;
    if (this.seleccionados.has(idEstudiante)) {
      this.seleccionados.delete(idEstudiante);
    } else {
      this.seleccionados.add(idEstudiante);
    }
  }

  marcarBloque(bloque: BloqueGrupo, marcar: boolean) {
    if (!this.editable) return;
    bloque.estudiantes.forEach(e => marcar ? this.seleccionados.add(e.id_estudiante) : this.seleccionados.delete(e.id_estudiante));
  }

  marcadosEnBloque(idGrupo: string): number {
    return this.estudiantes.filter(e => e.id_grupo === idGrupo && this.seleccionados.has(e.id_estudiante)).length;
  }

  totalEnBloque(idGrupo: string): number {
    return this.estudiantes.filter(e => e.id_grupo === idGrupo).length;
  }

  /** Solo cuentan los marcados que se ven en los grupos seleccionados. */
  get idsParaGuardar(): string[] {
    const visibles = new Set(this.estudiantes.map(e => e.id_estudiante));
    return Array.from(this.seleccionados).filter(id => visibles.has(id));
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }
    if (!this.model.fecha_vencimiento) {
      Swal.fire('Advertencia', 'La fecha y hora de vencimiento es obligatoria', 'warning');
      return;
    }
    if (this.accion === 'crear' && new Date(this.model.fecha_vencimiento) <= new Date()) {
      Swal.fire('Advertencia', 'La fecha de vencimiento debe ser posterior a este momento', 'warning');
      return;
    }
    const estudiantes = this.idsParaGuardar;
    if (estudiantes.length === 0) {
      Swal.fire('Advertencia', 'Marca al menos un estudiante', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      fecha_vencimiento: this.model.fecha_vencimiento,
      activo: this.model.activo ?? 1
    } as any;

    this.guardando = true;

    if (this.accion === 'crear') {
      this.enlacesService.crear(data).subscribe({
        next: (respuesta: any) => this.guardarEstudiantes(respuesta?.id, estudiantes, 'Enlace creado correctamente', true),
        error: (error: any) => {
          this.guardando = false;
          Swal.fire('Error', error?.error?.error || 'No se pudo crear el enlace', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.enlacesService.actualizar(data).subscribe({
        next: () => this.guardarEstudiantes(this.model.id, estudiantes, 'Enlace actualizado correctamente'),
        error: (error: any) => {
          this.guardando = false;
          Swal.fire('Error', error?.error?.error || 'No se pudo actualizar el enlace', 'error');
        }
      });
    }
  }

  // Los estudiantes se graban en una segunda llamada, con la lista completa.
  // Al crear, el formulario queda en edición para copiar o compartir el enlace.
  private guardarEstudiantes(idEnlace: any, estudiantes: string[], mensajeExito: string, esNuevo = false) {
    if (!idEnlace) {
      this.guardando = false;
      Swal.fire('Error', 'No se recibió el id del enlace', 'error');
      return;
    }

    this.enlacesEstudiantesService.reemplazarEstudiantesEnlace(idEnlace, estudiantes).subscribe({
      next: () => {
        this.guardando = false;
        if (esNuevo) {
          Swal.fire({
            icon: 'success',
            title: mensajeExito,
            text: 'Ya puedes copiar el enlace o compartirlo por WhatsApp.'
          });
          this.submitted = false;
          this.router.navigate(['/estudiantes/enlaces-autoregistro/editar', idEnlace], { replaceUrl: true });
          return;
        }
        Swal.fire({
          icon: 'success',
          title: mensajeExito,
          text: 'Desde el listado puedes copiar el enlace o compartirlo por WhatsApp.'
        });
        this.router.navigate([this.regresar]);
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Atención', error?.error?.error || 'El enlace se guardó, pero no se pudieron guardar los estudiantes.', 'warning');
      }
    });
  }

  copiarEnlace() {
    this.enlacesService.copiarEnlace({ ...this.enlaceGuardado, total_estudiantes: this.idsParaGuardar.length });
  }

  compartirWhatsapp() {
    this.enlacesService.compartirWhatsapp({ ...this.enlaceGuardado, total_estudiantes: this.idsParaGuardar.length });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}