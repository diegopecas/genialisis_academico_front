import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { UnidadesMedidasCorporalesService } from '../../../../../services/unidades-medidas-corporales.service';

@Component({
  selector: 'app-crear-unidad-medida',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-unidad-medida.component.html',
  styleUrl: './crear-unidad-medida.component.scss'
})
export class CrearUnidadMedidaComponent implements OnInit {

  public id = "0";
  public accion = "";
  public editable = true;
  public submitted = false;
  public titulo = "Unidad de Medida";
  public regresar = '/administracion/gestion-medidas/unidades';

  public model = {
    id: 0,
    nombre: "",
    abreviatura: ""
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private unidadesService: UnidadesMedidasCorporalesService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Unidad de Medida";
          break;
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Unidad de Medida";
          this.obtenerRegistro(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Unidad de Medida";
          this.obtenerRegistro(this.id);
          break;
      }
    });
  }

  obtenerRegistro(id: any) {
    this.unidadesService.obtenerById(id).subscribe((response: any) => {
      const body = response.body as any[];
      if (body && body.length > 0) {
        this.model = body[0];
      }
    });
  }

  guardar() {
    this.submitted = true;
    if (!this.model.nombre || !this.model.abreviatura) return;

    const servicio = this.accion === 'crear'
      ? this.unidadesService.crear(this.model)
      : this.unidadesService.actualizar(this.model);

    servicio.subscribe({
      next: () => {
        Swal.fire({
          title: this.accion === 'crear' ? 'Unidad creada' : 'Unidad actualizada',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => this.volver());
      },
      error: () => {
        Swal.fire('Error', 'Hubo un problema al guardar', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}