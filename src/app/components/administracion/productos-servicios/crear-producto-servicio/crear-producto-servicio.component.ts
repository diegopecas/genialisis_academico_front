import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CategoriaProductosServiciosService } from '../../../../services/categoria-productos-servicios.service';
import { ClasificacionProductosServiciosService } from '../../../../services/clasificacion-productos-servicios.service';
import { HorariosAlimentacionService } from '../../../../services/horarios-alimentacion.service';
import { PeriodicidadCobroService } from '../../../../services/periodicidad-cobro.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';

@Component({
  selector: 'app-crear-producto-servicio',
  templateUrl: './crear-producto-servicio.component.html',
  styleUrl: './crear-producto-servicio.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearProductoServicioComponent implements OnInit {

  titulo = "Crear Producto/Servicio";
  accion = "crear";
  regresar = "/administracion/productos-servicios";
  editable = true;
  submitted = false;
  productoServicioActivoSwitch = true;
  valorSugeridoFormateado = '';

  model = {
    id: null,
    nombre: '',
    detalles: '',
    id_clasificacion_productos_servicios: '',
    id_categoria_productos_servicios: '',
    id_periodicidad_cobro: '',
    valor_sugerido: '',
    id_horario_alimentacion_sugerido: '',
    disponible: 1,
    anio: new Date().getFullYear()
  } as any;

  listas = {
    clasificaciones: [] as any[],
    categorias: [] as any[],
    periodicidades: [] as any[],
    horarios: [] as any[]
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosServiciosService: ProductosServiciosService,
    private clasificacionService: ClasificacionProductosServiciosService,
    private categoriaService: CategoriaProductosServiciosService,
    private periodicidadService: PeriodicidadCobroService,
    private horariosService: HorariosAlimentacionService
  ) { }

  ngOnInit(): void {
    this.cargarListas();
    
    const accion = this.route.snapshot.paramMap.get('accion');
    const id = this.route.snapshot.paramMap.get('id');
    
    if (accion && id) {
      this.accion = accion;
      
      if (this.accion === 'editar') {
        this.titulo = "Editar Producto/Servicio";
        this.cargarProductoServicio(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Producto/Servicio";
        this.editable = false;
        this.cargarProductoServicio(id);
      }
    }
  }

  cargarListas() {
    this.clasificacionService.obtenerTodos().subscribe((response: any) => {
      this.listas.clasificaciones = response.body;
    });

    this.categoriaService.obtenerTodos().subscribe((response: any) => {
      this.listas.categorias = response.body;
    });

    this.periodicidadService.obtenerTodos().subscribe((response: any) => {
      this.listas.periodicidades = response.body;
    });

    this.horariosService.obtenerTodos().subscribe((response: any) => {
      this.listas.horarios = response.body;
    });
  }

  cargarProductoServicio(id: string) {
    this.productosServiciosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const data = response.body;
        
        this.model = {
          id: data.id,
          nombre: data.nombre || '',
          detalles: data.detalles || '',
          id_clasificacion_productos_servicios: data.id_clasificacion_productos_servicios || '',
          id_categoria_productos_servicios: data.id_categoria_productos_servicios || '',
          id_periodicidad_cobro: data.id_periodicidad_cobro || '',
          valor_sugerido: data.valor_sugerido || '',
          id_horario_alimentacion_sugerido: data.id_horario_alimentacion_sugerido || '',
          disponible: data.disponible,
          anio: data.anio || new Date().getFullYear()
        };
        
        if (this.accion === 'editar') {
          this.titulo = `Editar Producto/Servicio: ${data.nombre}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar Producto/Servicio: ${data.nombre}`;
        }
        
        if (this.model.valor_sugerido) {
          this.valorSugeridoFormateado = this.formatearNumero(this.model.valor_sugerido);
        }
        
        this.productoServicioActivoSwitch = data.disponible === 1;
      },
      error: (error: any) => {
        console.error("Error al cargar producto/servicio", error);
        Swal.fire('Error', 'No se pudo cargar el producto/servicio', 'error');
      }
    });
  }

  cambiarEstado() {
    this.model.disponible = this.productoServicioActivoSwitch ? 1 : 0;
  }

  formatearNumero(valor: any): string {
    if (!valor) return '';
    const numero = valor.toString().replace(/\D/g, '');
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  onValorChange(event: any) {
    let valor = event.target.value.replace(/\D/g, '');
    
    if (valor === '') {
      this.valorSugeridoFormateado = '';
      this.model.valor_sugerido = '';
      return;
    }
    
    this.valorSugeridoFormateado = this.formatearNumero(valor);
    this.model.valor_sugerido = valor;
  }

  guardar() {
    this.submitted = true;

    if (!this.validarFormulario()) {
      Swal.fire('Campos requeridos', 'Por favor complete todos los campos obligatorios', 'warning');
      return;
    }

    this.model.anio = new Date().getFullYear();

    const payload = {
      ...this.model,
      id_categoria_productos_servicios: this.model.id_categoria_productos_servicios || null,
      id_periodicidad_cobro: this.model.id_periodicidad_cobro || null,
      id_horario_alimentacion_sugerido: this.model.id_horario_alimentacion_sugerido || null,
      valor_sugerido: this.model.valor_sugerido || null
    };

    if (this.accion === 'crear') {
      this.productosServiciosService.crear(payload).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Producto/Servicio creado correctamente', 'success');
          this.router.navigate(['/administracion/productos-servicios']);
        },
        error: (error: any) => {
          console.error("Error al crear producto/servicio", error);
          Swal.fire('Error', 'No se pudo crear el producto/servicio', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      this.productosServiciosService.actualizar(payload).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Producto/Servicio actualizado correctamente', 'success');
          this.router.navigate(['/administracion/productos-servicios']);
        },
        error: (error: any) => {
          console.error("Error al actualizar producto/servicio", error);
          Swal.fire('Error', 'No se pudo actualizar el producto/servicio', 'error');
        }
      });
    }
  }

  validarFormulario(): boolean {
    return !!(
      this.model.nombre &&
      this.model.id_clasificacion_productos_servicios &&
      this.model.id_categoria_productos_servicios &&
      this.model.id_periodicidad_cobro
    );
  }

  volver() {
    this.router.navigate(['/administracion/productos-servicios']);
  }
}