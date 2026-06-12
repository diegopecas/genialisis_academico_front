import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { MedidasService } from '../../../../../services/medidas.service';
import { CategoriasMedidasService } from '../../../../../services/categorias-medidas.service';
import { ValoresMedidasService } from '../../../../../services/valores-medidas.service';
import { UnidadesMedidasCorporalesService } from '../../../../../services/unidades-medidas-corporales.service';

@Component({
  selector: 'app-crear-medida',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-medida.component.html',
  styleUrl: './crear-medida.component.scss'
})
export class CrearMedidaComponent implements OnInit {

  public id = "0";
  public accion = "";
  public editable = true;
  public submitted = false;
  public titulo = "Medida Corporal";
  public regresar = '/administracion/gestion-medidas/medidas';

  public listas = {
    categorias: [] as any[],
    unidades: [] as any[],
    tiposValor: [
      { id: 1, nombre: 'numerico' },
      { id: 2, nombre: 'porcentaje' },
      { id: 3, nombre: 'select' }
    ]
  };

  public model = {
    id: 0,
    nombre: "",
    unidad: "",
    id_categoria: "" as any,
    id_unidad: "" as any,
    id_tipo_valor: "" as any,
    orden: 0
  };

  // Valores para medidas tipo select
  public valoresMedida: any[] = [];
  public nuevoValor = { etiqueta: "", valor_numerico: 0, orden: 0 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private medidasService: MedidasService,
    private categoriasMedidasService: CategoriasMedidasService,
    private unidadesService: UnidadesMedidasCorporalesService,
    private valoresMedidasService: ValoresMedidasService
  ) {}

  ngOnInit(): void {
    this.cargarListas();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Medida Corporal";
          break;
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Medida Corporal";
          this.obtenerRegistro(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Medida Corporal";
          this.obtenerRegistro(this.id);
          break;
      }
    });
  }

  cargarListas() {
    this.categoriasMedidasService.obtenerTodos().subscribe((response: any) => {
      this.listas.categorias = response.body || [];
    });
    this.unidadesService.obtenerTodos().subscribe((response: any) => {
      this.listas.unidades = response.body || [];
    });
  }

  obtenerRegistro(id: any) {
    this.medidasService.obtenerById(id).subscribe((response: any) => {
      const body = response.body as any[];
      if (body && body.length > 0) {
        const reg = body[0];
        this.model = {
          id: reg.id,
          nombre: reg.nombre,
          unidad: reg.unidad || '',
          id_categoria: reg.id_categoria || '',
          id_unidad: reg.id_unidad || '',
          id_tipo_valor: reg.id_tipo_valor || '',
          orden: reg.orden || 0
        };
        this.cargarValoresMedida();
      }
    });
  }

  cargarValoresMedida() {
    if (this.model.id && this.esTipoSelect()) {
      this.valoresMedidasService.obtenerPorMedida(this.model.id).subscribe((response: any) => {
        this.valoresMedida = response.body || [];
      });
    }
  }

  esTipoSelect(): boolean {
    return this.model.id_tipo_valor == 3;
  }

  onTipoValorCambiado() {
    if (this.esTipoSelect() && this.model.id) {
      this.cargarValoresMedida();
    }
  }

  agregarValor() {
    if (!this.nuevoValor.etiqueta) return;

    const payload = {
      id_medida: this.model.id,
      etiqueta: this.nuevoValor.etiqueta,
      valor_numerico: this.nuevoValor.valor_numerico,
      orden: this.nuevoValor.orden,
      activo: 1
    };

    this.valoresMedidasService.crear(payload).subscribe({
      next: () => {
        this.nuevoValor = { etiqueta: "", valor_numerico: 0, orden: 0 };
        this.cargarValoresMedida();
      },
      error: () => {
        Swal.fire('Error', 'No se pudo agregar el valor', 'error');
      }
    });
  }

  eliminarValor(valor: any) {
    Swal.fire({
      title: '¿Eliminar?',
      text: `¿Eliminar la opción "${valor.etiqueta}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        this.valoresMedidasService.eliminar({ id: valor.id }).subscribe({
          next: () => this.cargarValoresMedida(),
          error: () => Swal.fire('Error', 'No se pudo eliminar', 'error')
        });
      }
    });
  }

  guardar() {
    this.submitted = true;
    if (!this.model.nombre || !this.model.id_categoria || !this.model.id_unidad || !this.model.id_tipo_valor) return;

    // Sincronizar campo legacy unidad
    const unidad = this.listas.unidades.find((u: any) => u.id == this.model.id_unidad);
    this.model.unidad = unidad ? unidad.abreviatura : '';

    const servicio = this.accion === 'crear'
      ? this.medidasService.crear(this.model)
      : this.medidasService.actualizar(this.model);

    servicio.subscribe({
      next: (response: any) => {
        const idCreado = response?.id || this.model.id;
        Swal.fire({
          title: this.accion === 'crear' ? 'Medida creada' : 'Medida actualizada',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          if (this.accion === 'crear' && this.esTipoSelect()) {
            this.model.id = idCreado;
            this.accion = 'editar';
            this.titulo = "Editar Medida Corporal";
            Swal.fire('Info', 'Ahora puede agregar las opciones de valor para esta medida', 'info');
          } else {
            this.volver();
          }
        });
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