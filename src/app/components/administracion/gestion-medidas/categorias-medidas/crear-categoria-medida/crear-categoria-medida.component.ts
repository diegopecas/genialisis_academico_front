import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { CategoriasMedidasService } from '../../../../../services/categorias-medidas.service';

@Component({
  selector: 'app-crear-categoria-medida',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-categoria-medida.component.html',
  styleUrl: './crear-categoria-medida.component.scss'
})
export class CrearCategoriaMedidaComponent implements OnInit {

  public id = "0";
  public accion = "";
  public editable = true;
  public submitted = false;
  public titulo = "Categoría de Medida";
  public regresar = '/administracion/gestion-medidas/categorias';

  public model = {
    id: 0,
    nombre: "",
    descripcion: "",
    icono: "fas fa-ruler",
    orden: 0,
    activo: 1
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoriasMedidasService: CategoriasMedidasService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Categoría de Medida";
          break;
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Categoría de Medida";
          this.obtenerRegistro(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Categoría de Medida";
          this.obtenerRegistro(this.id);
          break;
      }
    });
  }

  obtenerRegistro(id: any) {
    this.categoriasMedidasService.obtenerById(id).subscribe((response: any) => {
      const body = response.body as any[];
      if (body && body.length > 0) {
        this.model = body[0];
      }
    });
  }

  guardar() {
    this.submitted = true;
    if (!this.model.nombre) return;

    const servicio = this.accion === 'crear'
      ? this.categoriasMedidasService.crear(this.model)
      : this.categoriasMedidasService.actualizar(this.model);

    servicio.subscribe({
      next: (response: any) => {
        Swal.fire({
          title: this.accion === 'crear' ? 'Categoría creada' : 'Categoría actualizada',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => this.volver());
      },
      error: (error: any) => {
        Swal.fire('Error', 'Hubo un problema al guardar', 'error');
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}