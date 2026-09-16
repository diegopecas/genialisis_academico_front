import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';
import { AcudientesService } from '../../../services/acudientes.service';
import { EstudiantesService } from '../../../services/estudiantes.service';
import Swal from 'sweetalert2';

/**
 * Asigna el acudiente que pagó a los pagos ya registrados del estudiante.
 *
 * Existe porque los pagos anteriores a que el registro pidiera el acudiente
 * quedaron sin esa marca, y el certificado de pagos por acudiente solo puede
 * incluir los que la tienen.
 */
@Component({
  selector: 'app-acudiente-pagos',
  templateUrl: './acudiente-pagos.component.html',
  styleUrl: './acudiente-pagos.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class AcudientePagosComponent implements OnInit {

  public titulo = 'Acudiente de Pagos';
  public idEstudiante = '';
  public nombreEstudiante = '';

  public pagos = [] as any[];
  public acudientes = [] as any[];

  public seleccionados = new Set<string>();
  public idAcudiente: string | null = null;

  // Arranca en los pagos sin acudiente, que son los que hay que arreglar.
  public filtro: string = 'sin_acudiente';

  public asignando = false;
  public menuMovilAbierto = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagosService: PagosRecibidosService,
    private acudientesService: AcudientesService,
    private estudiantesService: EstudiantesService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.idEstudiante = params['id'];
      this.cargarEstudiante();
      this.cargarPagos();
      this.cargarAcudientes();
    });
  }

  cargarEstudiante(): void {
    this.estudiantesService.obtenerById(this.idEstudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        if (!body || body.length === 0) {
          return;
        }

        const estudiante = body[0];
        this.nombreEstudiante = [
          estudiante.primer_nombre,
          estudiante.segundo_nombre,
          estudiante.primer_apellido,
          estudiante.segundo_apellido,
        ]
          .filter(Boolean)
          .join(' ');
      },
      error: (error: any) => console.error('Error al cargar el estudiante', error)
    });
  }

  cargarPagos(): void {
    this.pagosService.obtenerByEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.pagos = (response.body as any[]) || [];
        this.seleccionados.clear();
      },
      error: (error: any) => console.error('Error al cargar los pagos', error)
    });
  }

  cargarAcudientes(): void {
    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.acudientes = (response.body as any[]) || [];
      },
      error: (error: any) => console.error('Error al cargar los acudientes', error)
    });
  }

  get pagosFiltrados(): any[] {
    if (this.filtro === 'sin_acudiente') {
      return this.pagos.filter((pago: any) => !pago.id_acudiente);
    }
    if (this.filtro === 'con_acudiente') {
      return this.pagos.filter((pago: any) => !!pago.id_acudiente);
    }
    return this.pagos;
  }

  get totalSinAcudiente(): number {
    return this.pagos.filter((pago: any) => !pago.id_acudiente && !this.esAnulado(pago)).length;
  }

  seleccionarFiltro(filtro: string): void {
    this.filtro = filtro;
    this.menuMovilAbierto = false;
    this.seleccionados.clear();
  }

  volver(): void {
    this.router.navigate(['/estudiantes/opciones/' + this.idEstudiante]);
  }

  esAnulado(pago: any): boolean {
    return Number(pago.anulado) === 1;
  }

  estaSeleccionado(pago: any): boolean {
    return this.seleccionados.has(pago.id);
  }

  alternar(pago: any): void {
    // Un pago anulado no se reasigna: su historia queda como quedó.
    if (this.esAnulado(pago)) {
      return;
    }

    if (this.seleccionados.has(pago.id)) {
      this.seleccionados.delete(pago.id);
    } else {
      this.seleccionados.add(pago.id);
    }
  }

  get todosSeleccionados(): boolean {
    const asignables = this.pagosFiltrados.filter((pago: any) => !this.esAnulado(pago));
    return asignables.length > 0 && asignables.every((pago: any) => this.seleccionados.has(pago.id));
  }

  alternarTodos(): void {
    const asignables = this.pagosFiltrados.filter((pago: any) => !this.esAnulado(pago));

    if (this.todosSeleccionados) {
      asignables.forEach((pago: any) => this.seleccionados.delete(pago.id));
      return;
    }

    asignables.forEach((pago: any) => this.seleccionados.add(pago.id));
  }

  async asignar(): Promise<void> {
    if (this.seleccionados.size === 0) {
      Swal.fire('Falta información', 'Selecciona al menos un pago.', 'warning');
      return;
    }
    if (!this.idAcudiente) {
      Swal.fire('Falta información', 'Selecciona el acudiente que pagó.', 'warning');
      return;
    }

    const acudiente = this.acudientes.find(
      (a: any) => a.id === this.idAcudiente
    );

    const confirmacion = await Swal.fire({
      title: '¿Confirmas la asignación?',
      text: `Se marcarán ${this.seleccionados.size} pago(s) como pagados por ${acudiente ? acudiente.nombre_persona : 'el acudiente seleccionado'}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d4af37',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, asignar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    this.asignando = true;

    this.pagosService.asignarAcudiente(Array.from(this.seleccionados), this.idAcudiente).subscribe({
      next: (respuesta: any) => {
        this.asignando = false;
        Swal.fire('Listo', `Se actualizaron ${respuesta.actualizados} pago(s).`, 'success');
        this.cargarPagos();
      },
      error: (error: any) => {
        this.asignando = false;
        console.error('Error al asignar el acudiente', error);
        Swal.fire('Error', error?.error?.error || 'No se pudo asignar el acudiente.', 'error');
      }
    });
  }

  numeroRecibo(pago: any): string {
    if (!pago.numero) {
      return '';
    }
    return `${pago.anio}-${String(pago.numero).padStart(4, '0')}`;
  }

  fechaTexto(fecha: string): string {
    if (!fecha) {
      return '';
    }
    // Se corta la cadena en vez de usar Date para no correr el día por zona horaria.
    const partes = fecha.substring(0, 10).split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  valorTexto(valor: any): string {
    const numero = Number(valor) || 0;
    return '$ ' + numero.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
}
