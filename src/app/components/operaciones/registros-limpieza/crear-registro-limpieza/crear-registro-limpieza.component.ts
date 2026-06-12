import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RegistrosLimpiezaService } from '../../../../services/registros-limpieza.service';
import { AreasFisicasService } from '../../../../services/areas-fisicas.service';
import { TiposProcesosLimpiezaService } from '../../../../services/tipos-procesos-limpieza.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { ExportarPdfRegistroLimpiezaService } from '../../../../services/exportar-pdf-registro-limpieza.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';

@Component({
  selector: 'app-crear-registro-limpieza',
  templateUrl: './crear-registro-limpieza.component.html',
  styleUrls: ['./crear-registro-limpieza.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearRegistroLimpiezaComponent implements OnInit {

  titulo = "Registro de Limpieza";
  accion = '';
  id = 0;

  // Datos del registro
  registro: any = {
    id_area_fisica: null,
    id_tipo_proceso_limpieza: null,
    fecha_programada: this.obtenerFechaLocal(),
    observaciones: '',
    detalles: [],
    consumos: []
  };

  // Listas para selects
  areas: any[] = [];
  procesos: any[] = [];

  // Elementos disponibles
  elementosFisicos: any[] = [];
  productosMobiliario: any[] = [];
  productosLimpieza: any[] = [];
  productosLimpiezaOriginal: any[] = []; // NUEVO: guardar cálculo original

  // Elementos seleccionados
  elementosSeleccionados = new Set<string>();

  // Estado del registro
  estadoActual = 1; // Programado por defecto
  enProceso = false;
  horaInicio: string | null = null;
  fechaReal: string | null = null; // NUEVO: Fecha real de ejecución
  fechaMinima: string = this.obtenerFechaLocal();

  // Para móvil
  isMobile = false;
  seccionActiva = 'elementos'; // elementos | productos | resumen
  areaBusqueda: string = '';
  areasFiltradas: any[] = [];
  mostrarListaAreas: boolean = false;
  mostrarBuscador: boolean = false;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private registrosService: RegistrosLimpiezaService,
    private areasService: AreasFisicasService,
    private procesosService: TiposProcesosLimpiezaService,
    private utilService: UtilService,
    private exportarPdfRegistroService: ExportarPdfRegistroLimpiezaService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());

    this.accion = this.route.snapshot.params['accion'];
    this.id = this.route.snapshot.params['id'];

    this.cargarDatosIniciales();

    if (this.accion === 'editar' || this.accion === 'consultar') {
      this.cargarRegistro();
    }
  }

  checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  cargarDatosIniciales() {
    // Cargar áreas
    this.areasService.obtenerActivas().subscribe((response: any) => {
      this.areas = response.body;
      this.areasFiltradas = this.areas; // Inicializar áreas filtradas

      // Si es crear, mostrar el buscador
      if (this.accion === 'crear') {
        this.mostrarBuscador = true;
      }
    });

    // Cargar tipos de proceso
    this.procesosService.obtenerTodos().subscribe((response: any) => {
      this.procesos = response.body;
    });
  }

  cargarRegistro() {
    this.registrosService.obtenerPorId(this.id).subscribe((response: any) => {
      const data = response.body;
      // Actualizar el título con el ID correcto
      if (this.accion === 'editar') {
        this.titulo = `Editar Registro de Limpieza: ${data.id}`;
      } else if (this.accion === 'consultar') {
        this.titulo = `Consultar Registro de Limpieza: ${data.id}`;
      }
      this.registro = {
        id: data.id,
        id_area_fisica: data.id_area_fisica,
        id_tipo_proceso_limpieza: data.id_tipo_proceso_limpieza,
        fecha_programada: data.fecha_programada || data.fecha, // CAMBIO: usar fecha_programada
        observaciones: data.observaciones || '',
        detalles: data.detalles || [],
        consumos: data.consumos || []
      };

      this.estadoActual = data.id_estado;
      this.horaInicio = data.hora_inicio;
      this.fechaReal = data.fecha; // Guardar fecha real de ejecución
      this.enProceso = data.id_estado === 2;

      // Cargar elementos para el área y proceso
      if (this.registro.id_area_fisica && this.registro.id_tipo_proceso_limpieza) {
        this.cargarElementosParaProceso();
      }

      // Marcar elementos ya seleccionados
      this.registro.detalles.forEach((d: any) => {
        if (d.id_elemento_fisico) {
          this.elementosSeleccionados.add(`ef_${d.id_elemento_fisico}`);
        }
        if (d.id_producto_mobiliario) {
          this.elementosSeleccionados.add(`pm_${d.id_producto_mobiliario}`);
        }
      });
    });
  }

  onAreaChange() {
    if (this.registro.id_area_fisica && this.registro.id_tipo_proceso_limpieza) {
      this.cargarElementosParaProceso();
    }
  }

  onProcesoChange() {
    if (this.registro.id_area_fisica && this.registro.id_tipo_proceso_limpieza) {
      this.cargarElementosParaProceso();
    }
  }

  cargarElementosParaProceso() {
    this.registrosService.obtenerElementosParaProceso(
      this.registro.id_area_fisica,
      this.registro.id_tipo_proceso_limpieza
    ).subscribe((response: any) => {
      const data = response.body;
      console.log("cargarElementosParaProceso", data);

      // Procesar elementos físicos con cantidad ajustable
      this.elementosFisicos = data.elementos_fisicos.map((e: any) => ({
        ...e,
        key: `ef_${e.id}`,
        tipo: 'elemento',
        seleccionado: this.accion === 'crear' ? true : this.elementosSeleccionados.has(`ef_${e.id}`),
        cantidad_maxima: e.cantidad_en_area || 1,
        cantidad_actual: e.cantidad_en_area || 1, // Cantidad ajustable
        descripcion_completa: e.descripcion
      }));

      // Procesar mobiliario con cantidad ajustable
      this.productosMobiliario = data.productos_mobiliario.map((p: any) => ({
        ...p,
        key: `pm_${p.id}`,
        tipo: 'mobiliario',
        seleccionado: this.accion === 'crear' ? true : this.elementosSeleccionados.has(`pm_${p.id}`),
        cantidad_maxima: p.cantidad || 1,
        cantidad_actual: p.cantidad || 1 // Cantidad ajustable
      }));

      // CAMBIO: Guardar productos originales CON la información de cálculo detallado
      this.productosLimpiezaOriginal = data.productos_limpieza.map((p: any) => ({
        ...p,
        calculo_detallado: p.calculo_detallado || { elementos: [], mobiliario: [] }
      }));

      // Calcular cantidades basadas en elementos seleccionados
      this.recalcularProductosLimpieza();

      // Si es editar, actualizar cantidades desde consumos guardados
      if (this.accion === 'editar' && this.registro.consumos.length > 0) {
        this.registro.consumos.forEach((c: any) => {
          const producto = this.productosLimpieza.find(p => p.id_producto_limpieza === c.id_producto_limpieza);
          if (producto) {
            producto.cantidad = c.cantidad_consumida;
            producto.cantidad_manual = true; // Marcar como editado manualmente
          }
        });
      }
    });
  }

  ajustarCantidadElemento(elemento: any, delta: number) {
    if (this.accion === 'consultar' || this.estadoActual > 1) return;

    const nuevaCantidad = elemento.cantidad_actual + delta;
    if (nuevaCantidad >= 0 && nuevaCantidad <= elemento.cantidad_maxima) {
      elemento.cantidad_actual = nuevaCantidad;
      // Si la cantidad es 0, desmarcar el elemento
      if (nuevaCantidad === 0) {
        elemento.seleccionado = false;
        this.elementosSeleccionados.delete(elemento.key);
      } else if (nuevaCantidad > 0 && !elemento.seleccionado) {
        elemento.seleccionado = true;
        this.elementosSeleccionados.add(elemento.key);
      }
      this.recalcularProductosLimpieza();
    }
  }


  recalcularProductosLimpieza() {
    if (!this.productosLimpiezaOriginal || this.productosLimpiezaOriginal.length === 0) {
      this.productosLimpieza = [];
      return;
    }

    // Crear mapas de elementos/mobiliario con sus cantidades actuales
    const elementosCantidades = new Map();
    this.elementosFisicos
      .filter(e => e.seleccionado && e.cantidad_actual > 0)
      .forEach(e => elementosCantidades.set(String(e.id), e.cantidad_actual / e.cantidad_maxima));

    const mobiliarioCantidades = new Map();
    this.productosMobiliario
      .filter(p => p.seleccionado && p.cantidad_actual > 0)
      .forEach(p => mobiliarioCantidades.set(String(p.id), p.cantidad_actual / p.cantidad_maxima));

    // Recalcular cada producto
    this.productosLimpieza = this.productosLimpiezaOriginal.map(p => {
      const productoExistente = this.productosLimpieza?.find(pl => pl.id_producto_limpieza === p.id_producto_limpieza);
      if (productoExistente?.cantidad_manual) {
        return productoExistente;
      }

      let cantidadCalculada = 0;

      // Sumar contribuciones de elementos físicos (proporcional a cantidad)
      if (p.calculo_detallado?.elementos) {
        p.calculo_detallado.elementos.forEach((detalle: any) => {
          const proporcion = elementosCantidades.get(String(detalle.id_elemento));
          if (proporcion !== undefined) {
            cantidadCalculada += parseFloat(detalle.subtotal) * proporcion;
          }
        });
      }

      // Sumar contribuciones de mobiliario (proporcional a cantidad)
      if (p.calculo_detallado?.mobiliario) {
        p.calculo_detallado.mobiliario.forEach((detalle: any) => {
          const proporcion = mobiliarioCantidades.get(String(detalle.id_mobiliario));
          if (proporcion !== undefined) {
            cantidadCalculada += parseFloat(detalle.subtotal) * proporcion;
          }
        });
      }

      const cantidadRedondeada = Math.round(cantidadCalculada * 10) / 10;

      return {
        ...p,
        cantidad: cantidadRedondeada,
        cantidad_original: cantidadRedondeada,
        tiene_stock: p.stock_actual >= cantidadRedondeada,
        incluido: cantidadRedondeada > 0,
        cantidad_manual: false
      };
    });
  }




  toggleElemento(elemento: any) {
    if (this.accion === 'consultar' || this.estadoActual > 1) return;

    elemento.seleccionado = !elemento.seleccionado;

    if (elemento.seleccionado) {
      this.elementosSeleccionados.add(elemento.key);
    } else {
      this.elementosSeleccionados.delete(elemento.key);
    }

    // Recalcular productos al cambiar selección
    this.recalcularProductosLimpieza();
  }



  toggleProducto(producto: any) {
    if (this.accion === 'consultar' || this.estadoActual > 1) return;

    producto.incluido = !producto.incluido;
    if (!producto.incluido) {
      producto.cantidad = 0;
    } else {
      producto.cantidad = producto.cantidad_original;
    }
  }

  ajustarCantidad(producto: any, delta: number) {
    if (this.accion === 'consultar' || this.estadoActual > 1) return;

    const nuevaCantidad = producto.cantidad + delta;
    if (nuevaCantidad >= 0) {
      producto.cantidad = nuevaCantidad;
      producto.cantidad_manual = true; // Marcar como editado manualmente
      producto.tiene_stock = producto.stock_actual >= nuevaCantidad;
    }
  }

  onCantidadChange(producto: any) {
    producto.cantidad_manual = true; // Marcar como editado manualmente
    producto.tiene_stock = producto.stock_actual >= producto.cantidad;
  }

  get elementosSeleccionadosCount(): number {
    return this.elementosFisicos.filter(e => e.seleccionado).length +
      this.productosMobiliario.filter(p => p.seleccionado).length;
  }

  get productosIncluidosCount(): number {
    return this.productosLimpieza.filter(p => p.incluido && p.cantidad > 0).length;
  }


  get puedeGuardar(): boolean {
    return this.registro.id_area_fisica &&
      this.registro.id_tipo_proceso_limpieza &&
      this.elementosSeleccionadosCount > 0 &&
      this.productosIncluidosCount > 0;
  }

  get puedeIniciar(): boolean {
    return this.puedeGuardar && this.estadoActual === 1;
  }

  get puedeFinalizar(): boolean {
    return this.estadoActual === 2 && this.enProceso;
  }

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;

    // Scroll suave a la sección en móvil
    if (this.isMobile) {
      setTimeout(() => {
        const element = document.getElementById(`seccion-${seccion}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }
  obtenerFechaLocal(): string {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  async guardar() {
    if (!this.puedeGuardar) {
      Swal.fire('Error', 'Complete todos los campos requeridos', 'error');
      return;
    }

    // Preparar detalles
    const detalles: any[] = [];

    this.elementosFisicos.filter(e => e.seleccionado).forEach(e => {
      detalles.push({
        id_elemento_fisico: e.id,
        id_producto_mobiliario: null
      });
    });

    this.productosMobiliario.filter(p => p.seleccionado).forEach(p => {
      detalles.push({
        id_elemento_fisico: null,
        id_producto_mobiliario: p.id
      });
    });

    // Preparar consumos
    const consumos = this.productosLimpieza
      .filter(p => p.incluido && p.cantidad > 0)
      .map(p => ({
        id_producto_limpieza: p.id_producto_limpieza,
        cantidad_consumida: p.cantidad,
        id_unidad_medida: p.id_unidad_medida
      }));

    const datos = {
      ...this.registro,
      fecha_programada: this.registro.fecha_programada, // CAMBIO: usar fecha_programada
      detalles,
      consumos,
      id_usuario_ejecutor: this.utilService.obtenerIdUsuarioActual()
    };

    const operacion = this.accion === 'editar'
      ? this.registrosService.actualizar(datos)
      : this.registrosService.crear(datos);

    operacion.subscribe({
      next: (response: any) => {
        Swal.fire({
          title: 'Programado',
          text: `El registro se ha programado para el ${this.registro.fecha_programada}`,
          icon: 'success'
        }).then(() => {
          this.router.navigate(['/operaciones/registros-limpieza']);
        });
      },
      error: (error: any) => {
        Swal.fire('Error', error.error?.error || 'No se pudo guardar el registro', 'error');
      }
    });
  }

  async guardarEIniciar() {
    if (!this.puedeGuardar) {
      Swal.fire('Error', 'Complete todos los campos requeridos', 'error');
      return;
    }

    const result = await Swal.fire({
      title: '¿Guardar e iniciar?',
      text: 'Se guardará el registro y se iniciará inmediatamente',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar e iniciar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      // Primero guardar
      const detalles: any[] = [];

      this.elementosFisicos.filter(e => e.seleccionado).forEach(e => {
        detalles.push({
          id_elemento_fisico: e.id,
          id_producto_mobiliario: null
        });
      });

      this.productosMobiliario.filter(p => p.seleccionado).forEach(p => {
        detalles.push({
          id_elemento_fisico: null,
          id_producto_mobiliario: p.id
        });
      });

      const consumos = this.productosLimpieza
        .filter(p => p.incluido && p.cantidad > 0)
        .map(p => ({
          id_producto_limpieza: p.id_producto_limpieza,
          cantidad_consumida: p.cantidad,
          id_unidad_medida: p.id_unidad_medida
        }));

      const datos = {
        ...this.registro,
        fecha_programada: this.registro.fecha_programada, // CAMBIO: usar fecha_programada
        detalles,
        consumos,
        id_usuario_ejecutor: this.utilService.obtenerIdUsuarioActual()
      };

      this.registrosService.crear(datos).subscribe({
        next: (response: any) => {
          const idCreado = response.body.id;

          // Luego iniciar
          this.registrosService.iniciar(idCreado).subscribe({
            next: (responseIniciar: any) => {
              Swal.fire({
                title: 'Guardado e iniciado',
                html: `Registro creado e iniciado a las ${responseIniciar.body.hora_inicio}`,
                icon: 'success'
              }).then(() => {
                this.router.navigate(['/operaciones/registros-limpieza']);
              });
            },
            error: (error: any) => {
              Swal.fire('Error', 'Se guardó pero no se pudo iniciar', 'error');
            }
          });
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo guardar el registro', 'error');
        }
      });
    }
  }

  iniciar() {
    if (this.estadoActual !== 1) return;

    this.registrosService.iniciar(this.id).subscribe({
      next: (response: any) => {
        this.horaInicio = response.body.hora_inicio;
        this.estadoActual = 2;
        this.enProceso = true;

        Swal.fire({
          title: 'Iniciado',
          text: `Proceso iniciado a las ${response.body.hora_inicio}`,
          icon: 'success'
        });
      },
      error: (error: any) => {
        Swal.fire('Error', error.error?.error || 'No se pudo iniciar', 'error');
      }
    });
  }

  async finalizar() {
    if (!this.puedeFinalizar) return;

    // Calcular productos que exceden el stock
    const productosConProblemas = this.productosLimpieza
      .filter(p => p.incluido && p.cantidad > p.stock_actual);

    let mensajeAdvertencia = '';
    if (productosConProblemas.length > 0) {
      mensajeAdvertencia = `
      <div class="alert alert-warning mb-3">
        <strong>⚠️ Algunos productos tienen stock insuficiente:</strong><br>
        ${productosConProblemas.map(p =>
        `• ${p.nombre}: Solicitado ${p.cantidad} ${p.abreviatura}, Stock ${p.stock_actual} ${p.abreviatura}`
      ).join('<br>')}
        <br><br>
        <strong>Se descontará solo el stock disponible</strong>
      </div>
    `;
    }

    const result = await Swal.fire({
      title: '¿Finalizar registro?',
      html: `
      ${mensajeAdvertencia}
      <div class="alert alert-info">
        <strong>Se descontarán del inventario los siguientes productos:</strong><br>
        ${this.productosLimpieza
          .filter(p => p.incluido && p.cantidad > 0)
          .map(p => `• ${p.nombre}: ${p.cantidad.toFixed(2)} ${p.abreviatura}`)
          .join('<br>')}
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Finalizar y descontar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const idUsuario = this.utilService.obtenerIdUsuarioActual();

      this.registrosService.finalizar(this.id, idUsuario).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Finalizado',
            html: `
            Proceso finalizado a las ${response.body.hora_fin}<br>
            Movimiento #${response.body.id_movimiento} creado
          `,
            icon: 'success'
          }).then(() => {
            this.router.navigate(['/operaciones/registros-limpieza']);
          });
        },
        error: (error: any) => {
          Swal.fire('Error', error.error?.error || 'No se pudo finalizar', 'error');
        }
      });
    }
  }

  cancelar() {
    this.router.navigate(['/operaciones/registros-limpieza']);
  }
  async generarInforme() {
    try {
      // Verificar que sea un registro finalizado o supervisado
      if (this.estadoActual !== 3 && this.estadoActual !== 4) {
        Swal.fire('No disponible', 'El informe solo está disponible para registros finalizados o supervisados', 'info');
        return;
      }

      // Mostrar mensaje de carga
      Swal.fire({
        title: 'Generando informe',
        text: 'Por favor espere...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Si no tenemos todos los datos, cargar el registro completo
      if (!this.registro.nombre_area || !this.registro.nombre_proceso) {
        await this.cargarDatosCompletos();
      }

      // Cargar el logo
      const logoBase64 = await this.cargarLogoBase64();

      // Obtener nombres de área y proceso
      const area = this.areas.find(a => a.id == this.registro.id_area_fisica);
      const proceso = this.procesos.find(p => p.id == this.registro.id_tipo_proceso_limpieza);

      // Preparar datos para el PDF
      const datosPDF = {
        registro: {
          ...this.registro,
          nombre_area: this.registro.nombre_area || area?.nombre || '',
          nombre_proceso: this.registro.nombre_proceso || proceso?.nombre || ''
        },
        nombreArea: area?.nombre || '',
        nombreProceso: proceso?.nombre || '',
        elementosFisicos: this.elementosFisicos.filter(e => e.seleccionado && e.cantidad_actual > 0),
        mobiliario: this.productosMobiliario.filter(p => p.seleccionado && p.cantidad_actual > 0),
        consumos: this.productosLimpieza
          .filter(p => p.incluido && p.cantidad > 0)
          .map(p => ({
            nombre_producto: p.nombre,
            cantidad_consumida: p.cantidad,
            cantidad: p.cantidad,
            unidad: p.abreviatura,
            abreviatura: p.abreviatura
          })),
        horaInicio: this.horaInicio,
        horaFin: this.registro.hora_fin,
        fechaReal: this.fechaReal,
        estadoActual: this.estadoActual,
        nombreEstado: this.estadoActual === 3 ? 'Realizado' :
          this.estadoActual === 4 ? 'Supervisado' : 'En proceso',
        nombreEjecutor: this.registro.nombre_ejecutor,
        nombreSupervisor: this.registro.nombre_supervisor,
        logoBase64: logoBase64,
        fechaGeneracion: new Date()
      };

      // Generar el PDF
      this.exportarPdfRegistroService.generarPDF(datosPDF);

      // Cerrar el mensaje de carga
      Swal.close();

      // Mostrar mensaje de éxito
      Swal.fire({
        title: 'Informe generado',
        text: 'El archivo PDF se ha descargado correctamente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al generar informe:', error);
      Swal.close();
      Swal.fire('Error', 'No se pudo generar el informe', 'error');
    }
  }

  // Método auxiliar para cargar datos completos si es necesario
  private async cargarDatosCompletos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.registrosService.obtenerPorId(this.id).subscribe({
        next: (response: any) => {
          const data = response.body;
          this.registro = {
            ...this.registro,
            ...data
          };
          resolve();
        },
        error: (error) => {
          console.error('Error cargando datos completos:', error);
          reject(error);
        }
      });
    });
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  filtrarAreas() {
    const busqueda = this.areaBusqueda.toLowerCase().trim();

    if (busqueda === '') {
      this.areasFiltradas = this.areas;
    } else {
      this.areasFiltradas = this.areas.filter(area =>
        area.nombre.toLowerCase().includes(busqueda) ||
        (area.descripcion && area.descripcion.toLowerCase().includes(busqueda))
      );
    }
  }

  seleccionarArea(area: any) {
    this.registro.id_area_fisica = area.id;
    this.areaBusqueda = '';
    this.mostrarBuscador = false;
    this.mostrarListaAreas = false;
    this.onAreaChange();
  }

  limpiarAreaSeleccionada() {
    this.registro.id_area_fisica = null;
    this.areaBusqueda = '';
    this.mostrarBuscador = true;
    this.areasFiltradas = this.areas;

    // Limpiar los elementos dependientes
    this.elementosFisicos = [];
    this.productosMobiliario = [];
    this.productosLimpieza = [];
    this.elementosSeleccionados.clear();
  }

  obtenerNombreArea(): string {
    const area = this.areas.find(a => a.id == this.registro.id_area_fisica);
    return area ? area.nombre : '';
  }

  ocultarLista() {
    // Usar setTimeout para permitir que el click en el item se procese primero
    setTimeout(() => {
      this.mostrarListaAreas = false;
    }, 200);
  }

}