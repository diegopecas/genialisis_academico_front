import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { EntesControlService } from '../../../services/entes-control.service';

@Component({
  selector: 'app-entes-control',
  templateUrl: './entes-control.component.html',
  styleUrl: './entes-control.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
})
export class EntesControlComponent implements OnInit {
  titulo = 'Entes de Control';
  public datos: any[] = [];
  public cargando = false;

  constructor(
    private entesControlService: EntesControlService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtener();
  }

  obtener() {
    this.cargando = true;
    this.entesControlService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.datos = (response.body as any[]) || [];
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al obtener entes de control', error);
        this.cargando = false;
      },
    });
  }

  crear() {
    this.router.navigate(['/administracion/entes-control/crear/0']);
  }

  editar(ente: any) {
    this.router.navigate(['/administracion/entes-control/editar/' + ente.id]);
  }

  async eliminar(ente: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el ente de control "${ente.nombre_ente}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      this.entesControlService.eliminar(ente.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El ente de control ha sido eliminado.', 'success');
          this.obtener();
        },
        error: (error: any) => {
          console.error('Error al eliminar ente de control', error);
          Swal.fire('Error', 'No se pudo eliminar el ente de control.', 'error');
        },
      });
    }
  }
}