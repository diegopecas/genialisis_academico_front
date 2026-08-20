import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { InventarioDiarioService } from '../../../services/inventario-diario.service';
import { ElementosInventarioService } from '../../../services/elementos-inventario.service';
import { GruposService } from '../../../services/grupos.service';
import { UtilService } from '../../../common/constantes/util.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inventario-diario',
  templateUrl: './inventario-diario.component.html',
  styleUrl: './inventario-diario.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InventarioDiarioComponent implements OnInit {

  titulo = "Inventario Diario";

  public grupos = [] as any[];
  public idGrupo: any = null;
  public fecha: string = '';
  public soloPresentes: boolean = true;

  // 'entrada' edita lo que el niño trajo, 'salida' lo que se lleva.
  public modo: string = 'entrada';

  public estudiantes = [] as any[];
  public columnas = [] as any[];
  public filas = [] as any[];
  public elementosCatalogo = [] as any[];

  public cargando: boolean = false;
  public guardando: boolean = false;

  // Cambios pendientes de guardar, indexados por id de fila para que marcar
  // dos veces el mismo check no mande dos cambios.
  private pendientes = new Map<string, boolean>();

  constructor(
    private inventarioDiarioService: InventarioDiarioService,
    private elementosInventarioService: ElementosInventarioService,
    private gruposService: GruposService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.fecha = this.obtenerFechaActual();
    this.consultaGrupos();
  }

  /**
   * Fecha actual en formato YYYY-MM-DD con hora local, no UTC.
   * No usar toISOString() porque desfasa el día.
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

  cambiarGrupo() {
    this.consultarDia();
    this.consultaElementosCatalogo();
  }

  consultaElementosCatalogo() {
    if (!this.idGrupo) return;

    // Catálogo completo del tenant, no solo el del grupo: sirve para que el
    // botón + pueda ofrecer un elemento que no es columna de este grupo.
    this.elementosInventarioService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.elementosCatalogo = body.filter((e: any) => e.activo == 1);
      },
      error: () => {
        this.elementosCatalogo = [];
      }
    });
  }

  consultarDia() {
    if (!this.idGrupo || !this.fecha) {
      return;
    }

    if (this.pendientes.size > 0) {
      Swal.fire('Atención', 'Hay cambios sin guardar. Grábalos antes de cambiar de grupo o fecha.', 'warning');
      return;
    }

    this.cargando = true;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    this.inventarioDiarioService.obtenerDiaGrupo(this.idGrupo, this.fecha, this.soloPresentes, idUsuario).subscribe({
      next: (respuesta: any) => {
        this.estudiantes = respuesta.estudiantes || [];
        this.columnas = respuesta.columnas || [];
        this.filas = respuesta.filas || [];
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el inventario del día', 'error');
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

  // Fila de inventario de un estudiante para una columna del catálogo.
  obtenerFila(idEstudiante: any, idElemento: any) {
    return this.filas.find((f: any) => f.id_estudiante === idEstudiante && f.id_elemento_inventario === idElemento);
  }

  // Elementos sueltos del niño, los que se agregaron con el +. No son columna,
  // se muestran como chips en su fila.
  obtenerSueltos(idEstudiante: any) {
    return this.filas.filter((f: any) => f.id_estudiante === idEstudiante && !f.id_elemento_inventario);
  }

  estaMarcado(fila: any): boolean {
    if (!fila) return false;

    if (this.pendientes.has(fila.id)) {
      return this.pendientes.get(fila.id) === true;
    }

    return this.modo === 'entrada' ? fila.trajo == 1 : fila.regreso == 1;
  }

  // En salida no se puede marcar lo que no entró en la mañana.
  estaBloqueado(fila: any): boolean {
    if (!fila) return true;
    return this.modo === 'salida' && fila.trajo != 1;
  }

  alternar(fila: any) {
    if (!fila || this.estaBloqueado(fila)) return;

    const valorActual = this.estaMarcado(fila);
    this.pendientes.set(fila.id, !valorActual);
  }

  get hayPendientes(): boolean {
    return this.pendientes.size > 0;
  }

  get totalPendientes(): number {
    return this.pendientes.size;
  }

  guardar() {
    // Se puede grabar aunque no haya cambios: que todos hayan traido todo es
    // un resultado valido y la docente necesita poder confirmarlo. En ese caso
    // se mandan los valores tal como estan, que ademas deja registrado quien
    // reviso el dia y cuando.
    const cambios = [] as any[];

    if (this.pendientes.size > 0) {
      this.pendientes.forEach((valor, id) => {
        cambios.push({ id: id, valor: valor ? 1 : 0 });
      });
    } else {
      this.filas.forEach((fila: any) => {
        if (this.estaBloqueado(fila)) {
          return;
        }
        cambios.push({ id: fila.id, valor: this.estaMarcado(fila) ? 1 : 0 });
      });
    }

    if (cambios.length === 0) {
      Swal.fire('Sin datos', 'No hay elementos que confirmar en este grupo.', 'info');
      return;
    }

    this.guardando = true;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    this.inventarioDiarioService.guardarLote(this.modo, cambios, idUsuario).subscribe({
      next: () => {
        // Se refleja en las filas que ya están en pantalla para no tener que
        // recargar toda la grilla.
        this.pendientes.forEach((valor, id) => {
          const fila = this.filas.find((f: any) => f.id === id);
          if (fila) {
            if (this.modo === 'entrada') {
              fila.trajo = valor ? 1 : 0;
            } else {
              fila.regreso = valor ? 1 : 0;
            }
          }
        });
        const eraConfirmacion = this.pendientes.size === 0;
        this.pendientes.clear();
        this.guardando = false;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: eraConfirmacion ? 'Inventario confirmado' : 'Inventario guardado',
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

  async agregarElemento(estudiante: any) {
    const opciones: any = {};
    this.elementosCatalogo.forEach((e: any) => {
      opciones[e.id] = e.nombre;
    });
    opciones['__otro__'] = 'Otro (escribirlo)';

    const { value: seleccion } = await Swal.fire({
      title: `Agregar a ${estudiante.primer_nombre}`,
      input: 'select',
      inputOptions: opciones,
      inputPlaceholder: 'Selecciona un elemento',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (!seleccion) return;

    let idElemento = null;
    let nombreLibre = null;

    if (seleccion === '__otro__') {
      const { value: texto } = await Swal.fire({
        title: 'Nombre del elemento',
        input: 'text',
        inputPlaceholder: 'Ej: Inhalador',
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        cancelButtonText: 'Cancelar'
      });

      if (!texto || texto.trim() === '') return;
      nombreLibre = texto.trim();
    } else {
      idElemento = seleccion;
    }

    const dato = {
      id_estudiante: estudiante.id_estudiante,
      fecha: this.fecha,
      id_elemento_inventario: idElemento,
      nombre_libre: nombreLibre,
      trajo: 1,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    this.inventarioDiarioService.crear(dato).subscribe({
      next: () => {
        this.consultarDia();
      },
      error: (error: any) => {
        const mensaje = error?.error?.error || 'No se pudo agregar el elemento';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  async quitarSuelto(fila: any) {
    const result = await Swal.fire({
      title: '¿Quitar elemento?',
      text: `Se quitará "${fila.nombre}" del día. No le aparecerá mañana.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.inventarioDiarioService.eliminar(fila.id).subscribe({
      next: () => {
        this.consultarDia();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo quitar el elemento', 'error');
      }
    });
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
      return !this.estaMarcado(f);
    });
  }
}
