import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { RegistroUtilesDiariosService } from '../../../services/utiles-diarios-registro.service';
import { GruposService } from '../../../services/grupos.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registro-utiles-diarios',
  templateUrl: './registro-utiles-diarios.component.html',
  styleUrl: './registro-utiles-diarios.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class RegistroUtilesDiariosComponent implements OnInit {

  titulo = "Útiles y Accesorios Diarios";

  public grupos = [] as any[];
  // null significa todos los grupos: la docente ve el jardin completo y
  // filtra en pantalla.
  public idGrupo: any = null;

  public busquedaEstudiante: string = '';
  public fecha: string = '';

  // Los que todavía no han salido. Ojo: la grilla nunca muestra a quien no
  // tenga entrada registrada ese día, eso lo filtra el backend siempre.
  public soloPresentes: boolean = false;

  // 'entrada' edita lo que el niño trajo, 'salida' lo que se lleva.
  public modo: string = 'entrada';

  public estudiantes = [] as any[];
  public columnas = [] as any[];
  public filas = [] as any[];

  public cargando: boolean = false;
  public guardando: boolean = false;

  // Cambios pendientes de guardar, indexados por id de fila para que marcar
  // dos veces el mismo check no mande dos cambios.
  // Cada pendiente guarda el estado nuevo de esa fila: 1 lo trajo, 0 no lo
  // trajo, null todavia sin verificar.
  private pendientes = new Map<string, number | null>();

  constructor(
    private registroUtilesDiariosService: RegistroUtilesDiariosService,
    private gruposService: GruposService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.fecha = this.obtenerFechaActual();
    this.consultaGrupos();
    this.consultarDia();
  }

  /**
   * Fecha actual en formato YYYY-MM-DD usando hora local (no UTC).
   * No usar new Date().toISOString().split('T')[0] porque convierte a UTC y desfasa el día.
   */
  private obtenerFechaActual(): string {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
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

  consultarDia() {
    if (!this.fecha) {
      return;
    }

    if (this.pendientes.size > 0) {
      Swal.fire('Atención', 'Hay cambios sin guardar. Grábalos antes de cambiar de grupo o fecha.', 'warning');
      return;
    }

    this.cargando = true;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    this.registroUtilesDiariosService.obtenerDiaGrupo(this.idGrupo, this.fecha, this.soloPresentes, idUsuario).subscribe({
      next: (respuesta: any) => {
        this.estudiantes = respuesta.estudiantes || [];
        this.columnas = respuesta.columnas || [];
        this.filas = respuesta.filas || [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el registro del día', 'error');
      }
    });
  }

  cambiarModo(modo: string) {
    if (this.pendientes.size > 0) {
      Swal.fire('Atención', 'Hay cambios sin guardar. Grábalos antes de cambiar de entrada a salida.', 'warning');
      return;
    }
    this.modo = modo;
  }

  // Estudiantes que coinciden con la busqueda por nombre.
  get estudiantesFiltrados(): any[] {
    const q = (this.busquedaEstudiante || '').trim().toLowerCase();
    if (q.length === 0) {
      return this.estudiantes;
    }
    return this.estudiantes.filter((e: any) => this.nombreEstudiante(e).toLowerCase().includes(q));
  }

  // Con "Todos" los ninos se muestran en secciones por grupo. Con un grupo
  // puntual no hay secciones, porque ya se esta filtrando arriba.
  get secciones(): any[] {
    const lista = this.estudiantesFiltrados;

    if (this.idGrupo) {
      return [{ id_grupo: null, nombre_grupo: null, estudiantes: lista }];
    }

    const mapa: { [id: string]: any } = {};
    lista.forEach((e: any) => {
      const id = e.id_grupo || 'sin-grupo';
      if (!mapa[id]) {
        mapa[id] = {
          id_grupo: e.id_grupo,
          nombre_grupo: e.nombre_grupo || 'Sin grupo',
          orden_grupo: e.orden_grupo ?? 9999,
          estudiantes: []
        };
      }
      mapa[id].estudiantes.push(e);
    });

    return Object.values(mapa).sort((a: any, b: any) => {
      if (a.orden_grupo !== b.orden_grupo) return a.orden_grupo - b.orden_grupo;
      return String(a.nombre_grupo).localeCompare(String(b.nombre_grupo));
    });
  }

  get totalEstudiantes(): number {
    return this.estudiantes.length;
  }

  // Todas las filas de un niño, tanto de columna como sueltas. Es lo que
  // pinta la tarjeta de la vista móvil.
  obtenerFilasEstudiante(idEstudiante: any) {
    return this.filas.filter((f: any) => f.id_estudiante === idEstudiante);
  }

  // Estado de una fila: 1 lo trajo, 0 no lo trajo, null sin verificar.
  estado(fila: any): number | null {
    if (!fila) return null;

    if (this.pendientes.has(fila.id)) {
      return this.pendientes.get(fila.id) ?? null;
    }

    const valor = this.modo === 'entrada' ? fila.trajo : fila.regreso;
    if (valor === null || valor === undefined || valor === '') return null;
    return valor == 1 ? 1 : 0;
  }

  estaMarcado(fila: any): boolean {
    return this.estado(fila) === 1;
  }

  esNegativo(fila: any): boolean {
    return this.estado(fila) === 0;
  }

  sinVerificar(fila: any): boolean {
    return this.estado(fila) === null;
  }

  // En salida no se puede marcar lo que no entró en la mañana.
  estaBloqueado(fila: any): boolean {
    if (!fila) return true;
    return this.modo === 'salida' && fila.trajo != 1;
  }

  // Al tocar la celda cicla: sin verificar -> lo trajo -> no lo trajo -> ...
  alternar(fila: any) {
    if (!fila || this.estaBloqueado(fila)) return;

    const actual = this.estado(fila);
    let siguiente: number | null;

    if (actual === null) {
      siguiente = 1;
    } else if (actual === 1) {
      siguiente = 0;
    } else {
      siguiente = null;
    }

    this.pendientes.set(fila.id, siguiente);
  }

  private marcarFilas(filas: any[], valor: number | null) {
    filas.forEach((fila: any) => {
      if (this.estaBloqueado(fila)) return;
      this.pendientes.set(fila.id, valor);
    });
  }

  // ---- Marcar todo: los tres niveles ----

  todoMarcado(): boolean {
    const editables = this.filas.filter((f: any) => !this.estaBloqueado(f));
    return editables.length > 0 && editables.every((f: any) => this.estaMarcado(f));
  }

  alternarTodo() {
    this.marcarFilas(this.filas, this.todoMarcado() ? null : 1);
  }

  columnaMarcada(idUtil: any): boolean {
    const editables = this.filas.filter((f: any) => f.id_util_diario === idUtil && !this.estaBloqueado(f));
    return editables.length > 0 && editables.every((f: any) => this.estaMarcado(f));
  }

  alternarColumna(idUtil: any) {
    const valor = this.columnaMarcada(idUtil) ? null : 1;
    this.marcarFilas(this.filas.filter((f: any) => f.id_util_diario === idUtil), valor);
  }

  estudianteMarcado(idEstudiante: any): boolean {
    const editables = this.obtenerFilasEstudiante(idEstudiante).filter((f: any) => !this.estaBloqueado(f));
    return editables.length > 0 && editables.every((f: any) => this.estaMarcado(f));
  }

  alternarEstudiante(idEstudiante: any) {
    const valor = this.estudianteMarcado(idEstudiante) ? null : 1;
    this.marcarFilas(this.obtenerFilasEstudiante(idEstudiante), valor);
  }

  get hayPendientes(): boolean {
    return this.pendientes.size > 0;
  }

  get totalPendientes(): number {
    return this.pendientes.size;
  }

  guardar() {
    // Se puede grabar aunque no haya cambios: que todos hayan traído todo es
    // un resultado válido y la docente necesita poder confirmarlo. En ese caso
    // se mandan los valores tal como están, que además deja registrado quién
    // revisó el día y cuándo.
    const cambios = [] as any[];

    if (this.pendientes.size > 0) {
      this.pendientes.forEach((valor, id) => {
        cambios.push({ id: id, valor: valor });
      });
    } else {
      this.filas.forEach((fila: any) => {
        if (this.estaBloqueado(fila)) {
          return;
        }
        cambios.push({ id: fila.id, valor: this.estado(fila) });
      });
    }

    if (cambios.length === 0) {
      Swal.fire('Sin datos', 'No hay útiles que confirmar en este grupo.', 'info');
      return;
    }

    this.guardando = true;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    const eraConfirmacion = this.pendientes.size === 0;

    this.registroUtilesDiariosService.guardarLote(this.modo, cambios, idUsuario).subscribe({
      next: () => {
        // Se refleja en las filas que ya están en pantalla para no tener que
        // recargar toda la grilla.
        this.pendientes.forEach((valor, id) => {
          const fila = this.filas.find((f: any) => f.id === id);
          if (fila) {
            if (this.modo === 'entrada') {
              fila.trajo = valor;
            } else {
              fila.regreso = valor;
            }
          }
        });
        this.pendientes.clear();
        this.guardando = false;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: eraConfirmacion ? 'Día confirmado' : 'Cambios guardados',
          showConfirmButton: false,
          timer: 2500
        });
      },
      error: () => {
        this.guardando = false;
        Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
      }
    });
  }

  // Un solo paso: se escribe el nombre y listo. Antes había que pasar por un
  // select con todo el catálogo, que no aportaba nada porque esos útiles ya
  // son columna de la grilla.
  async agregarUtil(estudiante: any) {
    const { value: texto } = await Swal.fire({
      title: `Agregar a ${estudiante.primer_nombre}`,
      input: 'text',
      inputPlaceholder: 'Ej: Inhalador',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!texto || texto.trim() === '') return;

    const dato = {
      id_estudiante: estudiante.id_estudiante,
      fecha: this.fecha,
      id_util_diario: null,
      nombre_libre: texto.trim(),
      trajo: 1,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    this.registroUtilesDiariosService.crear(dato).subscribe({
      next: (respuesta: any) => {
        // Se agrega a la lista que ya esta en pantalla en vez de recargar el
        // dia. Recargar botaba los cambios sin guardar, y como la fila si se
        // habia creado en la base, al reintentar chocaba contra el indice
        // unico con un "ya esta registrado" que no se entendia.
        this.filas.push({
          id: respuesta?.id,
          id_estudiante: estudiante.id_estudiante,
          id_util_diario: null,
          nombre_libre: texto.trim(),
          nombre: texto.trim(),
          icono: null,
          trajo: 1,
          regreso: null,
          orden: 999
        });
      },
      error: (error: any) => {
        const mensaje = error?.error?.error || 'No se pudo agregar el útil';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  async quitarSuelto(fila: any) {
    const result = await Swal.fire({
      title: '¿Quitar útil?',
      text: `Se quitará "${fila.nombre}" del día. No le aparecerá mañana.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.registroUtilesDiariosService.eliminar(fila.id).subscribe({
      next: () => {
        // Igual que al agregar: se saca de la lista en pantalla para no botar
        // los cambios que todavia no se han grabado.
        this.filas = this.filas.filter((f: any) => f.id !== fila.id);
        this.pendientes.delete(fila.id);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo quitar el útil', 'error');
      }
    });
  }

  // Horas de todas las entradas y salidas del nino ese dia, para mostrarlas
  // debajo del nombre. Un nino puede entrar y salir varias veces.
  jornadasTexto(estudiante: any): string {
    const jornadas = String(estudiante?.jornadas ?? '').trim();
    if (!jornadas) return '';

    return jornadas
      .split('|')
      .map((j: string) => j.trim().replace(/-\s*$/, '→'))
      .join(' · ');
  }

  nombreEstudiante(estudiante: any): string {
    return [
      estudiante.primer_nombre,
      estudiante.segundo_nombre,
      estudiante.primer_apellido,
      estudiante.segundo_apellido
    ].filter(p => !!p).join(' ');
  }

  // Un niño que trajo algo y no se lo lleva. Solo aplica en modo salida.
  tieneFaltantes(idEstudiante: any): boolean {
    if (this.modo !== 'salida') return false;

    return this.filas.some((f: any) => {
      if (f.id_estudiante !== idEstudiante || f.trajo != 1) return false;
      return this.esNegativo(f);
    });
  }
}
