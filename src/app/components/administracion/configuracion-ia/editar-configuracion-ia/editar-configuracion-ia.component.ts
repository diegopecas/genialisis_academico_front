import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { IaConfiguracionService } from '../../../../services/ia-configuracion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-configuracion-ia',
  templateUrl: './editar-configuracion-ia.component.html',
  styleUrl: './editar-configuracion-ia.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class EditarConfiguracionIaComponent implements OnInit {

  titulo = "Editar Configuración IA";
  accion: string = "editar";
  regresar = '/administracion/configuracion-ia';
  editable: boolean = true;

  model = {
    id: null,
    clave: '',
    valor: '',
    descripcion: '',
  } as any;

  constructor(
    private iaConfiguracionService: IaConfiguracionService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'editar') {
        this.editable = true;
        this.cargarConfiguracion(id);
      } else if (this.accion === 'consultar') {
        this.editable = false;
        this.cargarConfiguracion(id);
      }
    });
  }

  cargarConfiguracion(id: any) {
    this.iaConfiguracionService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Configuración IA cargada", body);
        if (body && body.length > 0) {
          this.model = body[0];
          this.titulo = this.accion === 'editar'
            ? "Editar: " + this.model.clave
            : "Consultar: " + this.model.clave;
        }
      },
      error: (error: any) => {
        console.error("Error al cargar configuración IA", error);
        Swal.fire('Error', 'No se pudo cargar la configuración', 'error');
      }
    });
  }

  guardar() {
    const data = {
      id: this.model.id,
      valor: this.model.valor,
      descripcion: this.model.descripcion,
    };

    this.iaConfiguracionService.actualizar(data).subscribe({
      next: (response: any) => {
        console.log("Configuración IA actualizada", response);
        Swal.fire('Éxito', 'Configuración actualizada correctamente', 'success');
        this.router.navigate(['/administracion/configuracion-ia']);
      },
      error: (error: any) => {
        console.error("Error al actualizar configuración IA", error);
        Swal.fire('Error', 'No se pudo actualizar la configuración', 'error');
      }
    });
  }

  volver() {
    this.router.navigate(['/administracion/configuracion-ia']);
  }
}