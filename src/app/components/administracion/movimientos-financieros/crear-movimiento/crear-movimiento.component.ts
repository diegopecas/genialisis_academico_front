import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../../common/header-anidado/header-anidado.component';
import { CategoriasMovimientosFinancierosService } from '../../../../services/categorias-movimientos-financieros.service';
import { ConceptosFinancierosService } from '../../../../services/conceptos-financieros.service';
import { MediosPagoFinancierosService } from '../../../../services/medios-pago-financieros.service';
import { MovimientosFinancierosService } from '../../../../services/movimientos-financieros.service';
import { TiposMovimientosFinancierosService } from '../../../../services/tipos-movimientos-financieros.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-crear-movimiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HeaderComponentAnidado],
  templateUrl: './crear-movimiento.component.html',
  styleUrl: './crear-movimiento.component.scss'
})
export class CrearMovimientoComponent implements OnInit {
  titulo = 'Movimientos Financieros';
  formulario!: FormGroup;
  accion: string = 'crear';
  idMovimiento: string = '';
  regresar = '/administracion/financiero/movimientos-financieros';

  tiposMovimiento: any[] = [];
  categorias: any[] = [];
  categoriasFiltradas: any[] = [];
  conceptos: any[] = [];
  conceptosFiltrados: any[] = [];
  mediosPago: any[] = [];

  conceptoSeleccionado: any = null;
  requiereDetalle: boolean = false;
  cargandoDatos: boolean = false;
  valorFormateado: string = '';
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private movimientosService: MovimientosFinancierosService,
    private categoriasService: CategoriasMovimientosFinancierosService,
    private conceptosService: ConceptosFinancierosService,
    private mediosPagoService: MediosPagoFinancierosService,
    private tiposMovimientoService: TiposMovimientosFinancierosService,
    private utilService: UtilService
  ) {
    this.crearFormulario();
  }

  ngOnInit(): void {
    // Determinar la acción basándose en la URL actual
    const currentUrl = this.router.url;

    if (currentUrl.includes('/crear')) {
      this.accion = 'crear';
      this.titulo = 'Crear Movimiento Financiero';
      // Solo cargar catálogos para crear
      this.cargarCatalogos();
    } else if (currentUrl.includes('/editar/')) {
      this.accion = 'editar';
      this.titulo = 'Editar Movimiento Financiero';

      // Obtener el ID del parámetro de ruta
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.idMovimiento = id;
          // Primero cargar los catálogos, luego el movimiento
          this.cargarDatosParaEdicion();
        }
      });
    } else if (currentUrl.includes('/ver/')) {
      this.accion = 'ver';
      this.titulo = 'Ver Movimiento Financiero';

      // Obtener el ID del parámetro de ruta
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.idMovimiento = id;
          // Primero cargar los catálogos, luego el movimiento
          this.cargarDatosParaEdicion();
        }
      });
    }

    // Configurar listeners después de determinar la acción
    this.configurarListeners();
  }

  private obtenerFechaColombia(): string {
    const now = new Date();
    // Crear fecha en zona horaria de Colombia (America/Bogota)
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));

    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  crearFormulario(): void {
    const fechaHoy = this.obtenerFechaColombia();

    this.formulario = this.fb.group({
      id: [null],
      fecha: [fechaHoy, Validators.required],
      id_tipo_movimiento: ['', Validators.required],
      id_categoria_movimiento_financiero: ['', Validators.required],
      id_concepto_financiero: ['', Validators.required],
      id_medio_pago_financiero: ['', Validators.required],
      valor: ['', [Validators.required, Validators.min(1)]],
      detalle: [''],
      observaciones: [''],
      referencia_externa: ['']
    });
  }

  configurarListeners(): void {
    // Escuchar cambios en tipo de movimiento
    this.formulario.get('id_tipo_movimiento')?.valueChanges.subscribe(value => {
      if (value && !this.cargandoDatos) {
        this.filtrarCategoriasPorTipo(value);
        // Limpiar selecciones dependientes
        this.formulario.patchValue({
          id_categoria_movimiento_financiero: '',
          id_concepto_financiero: ''
        });
        this.conceptosFiltrados = [];
      }
    });

    // Escuchar cambios en categoría
    this.formulario.get('id_categoria_movimiento_financiero')?.valueChanges.subscribe(value => {
      if (value && !this.cargandoDatos) {
        this.filtrarConceptosPorCategoria(value);
        // Limpiar selección de concepto
        this.formulario.patchValue({ id_concepto_financiero: '' });
      }
    });

    // Escuchar cambios en concepto
    this.formulario.get('id_concepto_financiero')?.valueChanges.subscribe(value => {
      if (value) {
        this.validarRequisitosConcepto(value);
      }
    });
  }

  cargarCatalogos(): void {
    // Cargar todos los catálogos en paralelo
    forkJoin({
      tipos: this.tiposMovimientoService.obtenerTodos(),
      categorias: this.categoriasService.obtenerTodos(),
      conceptos: this.conceptosService.obtenerTodos(),
      medios: this.mediosPagoService.obtenerTodos()
    }).subscribe({
      next: (respuestas: any) => {
        this.tiposMovimiento = respuestas.tipos.body || [];
        this.categorias = respuestas.categorias.body || [];
        this.conceptos = respuestas.conceptos.body || [];
        this.mediosPago = respuestas.medios.body || [];

        console.log('Catálogos cargados:', {
          tipos: this.tiposMovimiento.length,
          categorias: this.categorias.length,
          conceptos: this.conceptos.length,
          medios: this.mediosPago.length
        });
      },
      error: (error: any) => {
        console.error('Error al cargar catálogos:', error);
        Swal.fire('Error', 'Error al cargar los catálogos', 'error');
      }
    });
  }

  cargarDatosParaEdicion(): void {
    this.cargandoDatos = true;

    // Cargar todos los catálogos y luego el movimiento
    forkJoin({
      tipos: this.tiposMovimientoService.obtenerTodos(),
      categorias: this.categoriasService.obtenerTodos(),
      conceptos: this.conceptosService.obtenerTodos(),
      medios: this.mediosPagoService.obtenerTodos()
    }).subscribe({
      next: (respuestas: any) => {
        this.tiposMovimiento = respuestas.tipos.body || [];
        this.categorias = respuestas.categorias.body || [];
        this.conceptos = respuestas.conceptos.body || [];
        this.mediosPago = respuestas.medios.body || [];

        console.log('Catálogos cargados para edición:', {
          tipos: this.tiposMovimiento.length,
          categorias: this.categorias.length,
          conceptos: this.conceptos.length,
          medios: this.mediosPago.length
        });

        // Ahora cargar el movimiento
        this.cargarMovimiento(this.idMovimiento);
      },
      error: (error: any) => {
        console.error('Error al cargar catálogos:', error);
        Swal.fire('Error', 'Error al cargar los catálogos', 'error');
        this.cargandoDatos = false;
      }
    });
  }

  cargarMovimiento(id: string): void {
    console.log('Cargando movimiento con ID:', id);

    this.movimientosService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        // La respuesta viene como array, tomamos el primer elemento
        const movimientoArray = response.body;
        const movimiento = Array.isArray(movimientoArray) ? movimientoArray[0] : movimientoArray;
        console.log('Movimiento obtenido:', movimiento);

        if (!movimiento) {
          console.error('No se encontró el movimiento');
          Swal.fire('Error', 'No se encontró el movimiento', 'error');
          this.router.navigate(['/administracion/financiero/movimientos-financieros']);
          this.cargandoDatos = false;
          return;
        }

        // Verificar que los catálogos estén cargados
        console.log('Conceptos disponibles:', this.conceptos.length);
        console.log('Categorías disponibles:', this.categorias.length);

        // Buscar el concepto para obtener la categoría y el tipo
        const concepto = this.conceptos.find(c => c.id === movimiento.id_concepto_financiero);
        console.log('Buscando concepto con id:', movimiento.id_concepto_financiero);
        console.log('Concepto encontrado:', concepto);

        if (concepto) {
          const categoria = this.categorias.find(c => c.id === concepto.id_categoria_movimiento_financiero);
          console.log('Buscando categoría con id:', concepto.id_categoria_movimiento_financiero);
          console.log('Categoría encontrada:', categoria);

          if (categoria) {
            // Primero establecer el tipo de movimiento y filtrar categorías
            this.filtrarCategoriasPorTipo(categoria.id_tipo_movimiento);

            // Luego establecer la categoría y filtrar conceptos
            this.filtrarConceptosPorCategoria(categoria.id);

            // Ahora sí asignar todos los valores al formulario
            this.formulario.patchValue({
              id: movimiento.id,
              fecha: movimiento.fecha,
              id_tipo_movimiento: categoria.id_tipo_movimiento,
              id_categoria_movimiento_financiero: categoria.id,
              id_concepto_financiero: movimiento.id_concepto_financiero,
              id_medio_pago_financiero: movimiento.id_medio_pago_financiero,
              valor: movimiento.valor,
              detalle: movimiento.detalle || '',
              observaciones: movimiento.observaciones || '',
              referencia_externa: movimiento.referencia_externa || ''
            });
            this.valorFormateado = movimiento.valor.toLocaleString('es-CO');
            // Validar si requiere detalle
            this.validarRequisitosConcepto(movimiento.id_concepto_financiero);


          } else {
            Swal.fire('Error', 'No se pudo cargar la información completa del movimiento', 'error');
          }
        } else {
          console.error('No se encontró el concepto del movimiento');
          console.error('ID de concepto buscado:', movimiento.id_concepto_financiero);
          console.error('Conceptos disponibles:', this.conceptos);
          Swal.fire('Error', 'No se pudo cargar la información completa del movimiento', 'error');
        }

        // Si es modo ver, deshabilitar el formulario
        if (this.accion === 'ver') {
          this.formulario.disable();
        }

        // Restablecer el flag de carga
        this.cargandoDatos = false;
      },
      error: (error: any) => {
        console.error('Error al cargar movimiento:', error);
        Swal.fire('Error', 'No se pudo cargar el movimiento', 'error');
        this.router.navigate(['/administracion/financiero/movimientos-financieros']);
        this.cargandoDatos = false;
      }
    });
  }

  filtrarCategoriasPorTipo(idTipo: number): void {
    this.categoriasFiltradas = this.categorias.filter(
      categoria => categoria.id_tipo_movimiento === idTipo
    );
    console.log(`Categorías filtradas para tipo ${idTipo}:`, this.categoriasFiltradas);
  }

  filtrarConceptosPorCategoria(idCategoria: number): void {
    this.conceptosFiltrados = this.conceptos.filter(
      concepto => concepto.id_categoria_movimiento_financiero === idCategoria
    );
    console.log(`Conceptos filtrados para categoría ${idCategoria}:`, this.conceptosFiltrados);
  }

  validarRequisitosConcepto(idConcepto: number): void {
    this.conceptoSeleccionado = this.conceptos.find(c => c.id === idConcepto);

    if (this.conceptoSeleccionado) {
      this.requiereDetalle = this.conceptoSeleccionado.requiere_detalle === 1;

      const detalleControl = this.formulario.get('detalle');
      if (this.requiereDetalle) {
        detalleControl?.setValidators([Validators.required]);
      } else {
        detalleControl?.clearValidators();
      }
      detalleControl?.updateValueAndValidity();
    }
  }

  guardar(): void {
    if (this.formulario.invalid) {
      Swal.fire('Formulario inválido', 'Por favor complete todos los campos requeridos', 'warning');
      this.formulario.markAllAsTouched();
      return;
    }

    const formValue = this.formulario.value;
    const datos = {
      id: formValue.id,
      fecha: formValue.fecha,
      id_concepto_financiero: formValue.id_concepto_financiero,
      id_medio_pago_financiero: formValue.id_medio_pago_financiero,
      valor: formValue.valor,
      detalle: formValue.detalle || null,
      observaciones: formValue.observaciones || null,
      referencia_externa: formValue.referencia_externa || null,
      id_usuario_registro: this.utilService.obtenerIdUsuarioActual()
    };

    const peticion = this.accion === 'crear'
      ? this.movimientosService.crear(datos)
      : this.movimientosService.actualizar(datos);

    peticion.subscribe({
      next: (response) => {
        Swal.fire(
          '¡Éxito!',
          `Movimiento ${this.accion === 'crear' ? 'creado' : 'actualizado'} exitosamente`,
          'success'
        );
        this.router.navigate(['/administracion/financiero/movimientos-financieros']);
      },
      error: (error: any) => {
        console.error('Error al guardar:', error);
        Swal.fire('Error', error.error?.error || 'Error al guardar el movimiento', 'error');
      }
    });
  }

  cancelar(): void {
    this.valorFormateado = '';
    this.router.navigate(['/administracion/financiero/movimientos-financieros']);
  }

  campoNoValido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control?.invalid && control?.touched);
  }
  formatearValor(event: any): void {
    let valor = event.target.value.replace(/\D/g, ''); // Solo dígitos

    if (valor === '') {
      this.valorFormateado = '';
      this.formulario.patchValue({ valor: '' });
      return;
    }

    // Formatear con separador de miles (punto para Colombia)
    this.valorFormateado = Number(valor).toLocaleString('es-CO');

    // Actualizar el valor real en el formulario (sin formato)
    this.formulario.patchValue({ valor: Number(valor) }, { emitEvent: false });
  }

  desformatearValor(event: any): void {
    const valor = event.target.value.replace(/\./g, '');
    this.formulario.patchValue({ valor: parseInt(valor) || 0 });
  }


}