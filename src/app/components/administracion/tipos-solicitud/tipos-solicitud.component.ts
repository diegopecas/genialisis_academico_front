import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { TiposSolicitudService } from '../../../services/tipos-solicitud.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-tipos-solicitud',
  templateUrl: './tipos-solicitud.component.html',
  styleUrl: './tipos-solicitud.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class TiposSolicitudComponent implements OnInit {

  titulo = "Compromisos";

  // La grilla muestra activos e inactivos: un tipo inactivo sigue aqui para
  // que el jardin vea como queda configurado, aunque no se pueda escoger al
  // crear una solicitud.
  public tipos = [] as any[];
  public cargando: boolean = false;

  constructor(
    private tiposService: TiposSolicitudService,
    private router: Router
  ) { }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.tiposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tipos = response.body || [];
        this.cargando = false;
      },
      error: () => {
        this.tipos = [];
        this.cargando = false;
      }
    });
  }

  crear() {
    this.router.navigate(['/administracion/operaciones/compromisos/crear/nuevo']);
  }

  editar(tipo: any) {
    this.router.navigate(['/administracion/operaciones/compromisos/editar', tipo.id]);
  }

  eliminar(tipo: any) {
    Swal.fire({
      title: '¿Eliminar el tipo?',
      text: 'Solo se puede si nunca se ha usado. Si ya tiene solicitudes, desactívelo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.tiposService.eliminar(tipo.id).subscribe({
        next: () => {
          this.cargar();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo eliminar', 'error');
        }
      });
    });
  }

  textoHoras(tipo: any): string {
    if (tipo.manejo_horas === 1) return 'Una hora';
    if (tipo.manejo_horas === 2) return 'Varias horas';
    return 'Sin horas';
  }

  textoDocumento(tipo: any): string {
    if (tipo.documento === 1) return 'Opcional';
    if (tipo.documento === 2) return 'Obligatorio';
    return 'No aplica';
  }
}
