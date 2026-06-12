import { Component, OnInit, OnDestroy, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { VisitasService } from '../../../../services/visitas.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Tab1RegistroComponent } from './tabs/tab1-registro/tab1-registro.component';
import { Tab2ProtocoloComponent } from './tabs/tab2-protocolo/tab2-protocolo.component';
import { Tab3ObjecionesComponent } from './tabs/tab3-objeciones/tab3-objeciones.component';
import { Tab4CierreComponent } from './tabs/tab4-cierre/tab4-cierre.component';

@Component({
  selector: 'app-crear-visita',
  templateUrl: './crear-visita.component.html',
  styleUrl: './crear-visita.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    Tab1RegistroComponent,
    Tab2ProtocoloComponent,
    Tab3ObjecionesComponent,
    Tab4CierreComponent
  ]
})
export class CrearVisitaComponent implements OnInit, OnDestroy {

  // ✅ Referencias a los componentes de los tabs
  @ViewChild(Tab1RegistroComponent) tab1!: Tab1RegistroComponent;
  @ViewChild(Tab2ProtocoloComponent) tab2!: Tab2ProtocoloComponent;
  @ViewChild(Tab3ObjecionesComponent) tab3!: Tab3ObjecionesComponent;
  @ViewChild(Tab4CierreComponent) tab4!: Tab4CierreComponent;

  titulo = "Registro de Visita";
  accion = 'crear';
  idVisita: number | null = null;

  tabActivo = 1;
  totalTabs = 4;

  public isMobile = false;
  public menuRapidoAbierto = false;

  catalogos: any = null;
  cargandoCatalogos: boolean = true;

  visitaData: any = {
    visita: {},
    visitantes: [],
    ninos: [],
    razonesBusqueda: [],
    observacionesDisc: [],
    temperatura: {},
    seguimiento: {},
    compromisos: [],
    protocoloPasos: [],
    protocoloChecklist: [],
    objeciones: [],
    resultado: {},
    serviciosGustaron: [],
    aspectosPositivos: {},
    detalleObsequio: {},
    serviciosNoTenemos: [],
    feedbackMejorar: [],
    perfilProspecto: {},
    competencia: {},
    aprendizajes: {}
  };

  guardando = false;
  cambiosSinGuardar = false;
  // ✅ Rastrear qué propiedades fueron emitidas por los tabs
  private propiedadesEmitidas = new Set<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private visitasService: VisitasService
  ) { }

  ngOnInit(): void {
    this.checkDevice();
    this.cargarCatalogos();

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.accion = params['accion'] || 'crear';
      this.idVisita = params['id'] ? parseInt(params['id']) : null;

      if (this.accion === 'editar' || this.accion === 'ver') {
        this.cargarVisita();
      } else {
        this.inicializarNuevaVisita();
      }
    });

    this.actualizarTitulo();
    this.setupOutsideClickListener();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogos(): void {
    this.cargandoCatalogos = true;

    this.visitasService.obtenerCatalogos().subscribe({
      next: (response: any) => {
        this.catalogos = response.body;
        this.cargandoCatalogos = false;
      },
      error: (error: any) => {
        this.cargandoCatalogos = false;

        Swal.fire({
          icon: 'error',
          title: 'Error al cargar catálogos',
          text: 'No se pudieron cargar las opciones del formulario. Por favor recargue la página.',
          confirmButtonColor: '#FFD700'
        });
      }
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkDevice();
  }

  checkDevice() {
    this.isMobile = window.innerWidth <= 768;

    if (!this.isMobile) {
      this.menuRapidoAbierto = false;
    }
  }

  setupOutsideClickListener() {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (this.menuRapidoAbierto && !target.closest('.mobile-quick-nav')) {
        this.menuRapidoAbierto = false;
      }
    });
  }

  actualizarTitulo(): void {
    const titulos: any = {
      'crear': 'Nueva Visita',
      'editar': 'Editar Visita',
      'ver': 'Detalle de Visita'
    };
    this.titulo = titulos[this.accion] || 'Registro de Visita';
  }

  inicializarNuevaVisita(): void {
    const ahora = new Date();
    this.visitaData.visita = {
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toTimeString().split(' ')[0].substring(0, 5),
      agendada: false,
      id_tipo_contacto: 1,
    };
  }

  cargarVisita(): void {
    if (!this.idVisita) return;

    this.visitasService.obtenerVisitaCompleta(this.idVisita).subscribe({
      next: (response: any) => {
        this.visitaData = response.body;
      },
      error: (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la visita',
          confirmButtonColor: '#FFD700'
        });
        this.router.navigate(['/administracion/crm/visitas']);
      }
    });
  }

  irATab(numeroTab: number): void {
    if (numeroTab < 1 || numeroTab > this.totalTabs) return;

    this.tabActivo = numeroTab;

    if (this.isMobile) {
      setTimeout(() => {
        const contenido = document.querySelector('.tab-content');
        if (contenido) {
          contenido.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  async guardar(): Promise<void> {
    if (this.guardando || this.accion === 'ver') return;

    this.guardando = true;

    try {
      if (!this.idVisita) {
        await this.crearVisitaCompleta();
      } else {
        await this.actualizarVisitaCompleta();
      }

      this.cambiosSinGuardar = false;

      // ✅ Limpiar los cambios de los tabs después de guardar exitosamente
      this.limpiarCambiosTabs();

      Swal.fire({
        icon: 'success',
        title: '¡Visita guardada!',
        text: 'Los datos se han guardado correctamente',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end'
      });

    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: 'No se pudieron guardar los cambios',
        confirmButtonColor: '#FFD700'
      });
    } finally {
      this.guardando = false;
    }
  }

  async crearVisitaCompleta(): Promise<void> {
    return new Promise((resolve, reject) => {
      const datosCompletos = {
        ...this.visitaData,
        visita: {
          ...this.visitaData.visita,
          id_usuario_registro: this.obtenerIdUsuario()
        }
      };

      this.visitasService.crearVisitaCompleta(datosCompletos).subscribe({
        next: (response: any) => {
          this.idVisita = response.body.id;
          this.visitaData.visita.id = this.idVisita;

          this.router.navigate(
            ['/administracion/crm/visitas/editar', this.idVisita],
            { replaceUrl: true }
          );

          resolve();
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }


  // ✅ Limpiar los cambios de todos los tabs
  limpiarCambiosTabs(): void {

    if (this.tab1) {
      this.tab2.limpiarCambios();
    }
    // Tabs 2, 3, 4 tienen dirty tracking
    if (this.tab2) {
      this.tab2.limpiarCambios();
    }
    if (this.tab3) {
      this.tab3.limpiarCambios();
    }
    if (this.tab4) {
      this.tab4.limpiarCambios();
    }
    // ✅ Limpiar propiedades emitidas
    this.propiedadesEmitidas.clear();
    console.log('🧹 Cambios limpiados en todos los tabs');
  }

  async actualizarVisitaCompleta(): Promise<void> {
    return new Promise((resolve, reject) => {
      const datosCompletos: any = {};

      // ✅ Solo enviar visita si fue modificada
      if (this.propiedadesEmitidas.has('visita')) {
        datosCompletos.visita = this.visitaData.visita;
      }

      // Solo enviar las propiedades que fueron emitidas por los tabs
      if (this.propiedadesEmitidas.has('visitantes')) {
        datosCompletos.visitantes = this.visitaData.visitantes;
      }
      if (this.propiedadesEmitidas.has('ninos')) {
        datosCompletos.ninos = this.visitaData.ninos;
      }
      if (this.propiedadesEmitidas.has('razonesBusqueda')) {
        datosCompletos.razonesBusqueda = this.visitaData.razonesBusqueda;
      }
      if (this.propiedadesEmitidas.has('observacionesDisc')) {
        datosCompletos.observacionesDisc = this.visitaData.observacionesDisc;
      }
      if (this.propiedadesEmitidas.has('temperatura')) {
        datosCompletos.temperatura = this.visitaData.temperatura;
      }
      if (this.propiedadesEmitidas.has('seguimiento')) {
        datosCompletos.seguimiento = this.visitaData.seguimiento;
      }
      if (this.propiedadesEmitidas.has('preferencias_seguimiento')) {
        datosCompletos.preferencias_seguimiento = this.visitaData.preferencias_seguimiento;
      }
      if (this.propiedadesEmitidas.has('compromisos')) {
        datosCompletos.compromisos = this.visitaData.compromisos;
      }
      if (this.propiedadesEmitidas.has('perfilSeleccionado')) {
        datosCompletos.perfilSeleccionado = this.visitaData.perfilSeleccionado;
      }
      if (this.propiedadesEmitidas.has('protocoloPasos')) {
        datosCompletos.protocoloPasos = this.visitaData.protocoloPasos;
      }
      if (this.propiedadesEmitidas.has('protocoloChecklist')) {
        datosCompletos.protocoloChecklist = this.visitaData.protocoloChecklist;
      }
      if (this.propiedadesEmitidas.has('objeciones')) {
        datosCompletos.objeciones = this.visitaData.objeciones;
      }
      if (this.propiedadesEmitidas.has('resultado')) {
        datosCompletos.resultado = this.visitaData.resultado;
      }
      if (this.propiedadesEmitidas.has('serviciosGustaron')) {
        datosCompletos.serviciosGustaron = this.visitaData.serviciosGustaron;
      }
      if (this.propiedadesEmitidas.has('aspectosPositivos')) {
        datosCompletos.aspectosPositivos = this.visitaData.aspectosPositivos;
      }
      if (this.propiedadesEmitidas.has('detalleObsequio')) {
        datosCompletos.detalleObsequio = this.visitaData.detalleObsequio;
      }
      if (this.propiedadesEmitidas.has('serviciosNoTenemos')) {
        datosCompletos.serviciosNoTenemos = this.visitaData.serviciosNoTenemos;
      }
      if (this.propiedadesEmitidas.has('feedbackMejorar')) {
        datosCompletos.feedbackMejorar = this.visitaData.feedbackMejorar;
      }
      if (this.propiedadesEmitidas.has('perfilProspecto')) {
        datosCompletos.perfilProspecto = this.visitaData.perfilProspecto;
      }
      if (this.propiedadesEmitidas.has('competencia')) {
        datosCompletos.competencia = this.visitaData.competencia;
      }
      if (this.propiedadesEmitidas.has('aprendizajes')) {
        datosCompletos.aprendizajes = this.visitaData.aprendizajes;
      }

      // 📊 Log para ver qué se está enviando
      const seccionesEnviadas = Object.keys(datosCompletos);
      console.log('📤 Enviando al backend solo propiedades emitidas:', seccionesEnviadas);
      console.log('📦 Total de secciones:', seccionesEnviadas.length);

      this.visitasService.actualizarVisitaCompleta(this.idVisita!, datosCompletos).subscribe({
        next: (response: any) => {
          resolve();
        },
        error: (error: any) => {
          reject(error);
        }
      });
    });
  }


  obtenerIdUsuario(): number {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    return usuario.id || 1;
  }

  async onDatosActualizados(datos: any, tab: number): Promise<void> {
    this.cambiosSinGuardar = true;
    // ✅ Registrar qué propiedades fueron emitidas
    Object.keys(datos).forEach(key => {
      this.propiedadesEmitidas.add(key);
    });
    switch (tab) {
      case 1:
        // ✅ Si no hay ID de visita y hay visitantes, crear la visita completa
        if (!this.idVisita && datos.visitantes && datos.visitantes.length > 0) {
          await this.crearVisitaAutomaticamente(datos);
          return;
        }

        this.visitaData.visita = datos.visita;
        this.visitaData.visitantes = datos.visitantes;
        this.visitaData.ninos = datos.ninos;
        this.visitaData.razonesBusqueda = datos.razonesBusqueda;
        if (datos.observacionesDisc) {
          if (!this.visitaData.observacionesDisc) {
            this.visitaData.observacionesDisc = {};
          }
          Object.assign(this.visitaData.observacionesDisc, datos.observacionesDisc);
        }
        this.visitaData.temperatura = datos.temperatura;
        this.visitaData.seguimiento = datos.seguimiento;
        this.visitaData.preferencias_seguimiento = datos.preferencias_seguimiento;
        this.visitaData.compromisos = datos.compromisos;
        break;

      case 2:
        this.visitaData.protocoloPasos = datos.protocoloPasos || [];
        this.visitaData.protocoloChecklist = datos.protocoloChecklist || [];
        break;

      case 3:
        this.visitaData.objeciones = datos.objeciones || [];
        break;

      case 4:
        // ✅ TAB 4 - Solo actualizar las propiedades que vienen en datos
        if (datos.resultado !== undefined) {
          this.visitaData.resultado = datos.resultado;
        }
        if (datos.serviciosGustaron !== undefined) {
          this.visitaData.serviciosGustaron = datos.serviciosGustaron;
        }
        if (datos.aspectosPositivos !== undefined) {
          this.visitaData.aspectosPositivos = datos.aspectosPositivos;
        }
        if (datos.detalleObsequio !== undefined) {
          this.visitaData.detalleObsequio = datos.detalleObsequio;
        }
        if (datos.serviciosNoTenemos !== undefined) {
          this.visitaData.serviciosNoTenemos = datos.serviciosNoTenemos;
        }
        if (datos.feedbackMejorar !== undefined) {
          this.visitaData.feedbackMejorar = datos.feedbackMejorar;
        }
        if (datos.perfilProspecto !== undefined) {
          this.visitaData.perfilProspecto = datos.perfilProspecto;
        }
        if (datos.competencia !== undefined) {
          this.visitaData.competencia = datos.competencia;
        }
        if (datos.aprendizajes !== undefined) {
          this.visitaData.aprendizajes = datos.aprendizajes;
        }
        break;
    }
  }
  async crearVisitaAutomaticamente(datos: any): Promise<void> {
    try {
      console.log('🔄 Creando visita automáticamente al agregar primer visitante...');

      const datosCompletos = {
        visita: {
          ...datos.visita,
          id_usuario_registro: this.obtenerIdUsuario()
        },
        visitantes: datos.visitantes,
        ninos: datos.ninos || [],
        razonesBusqueda: datos.razonesBusqueda || [],
        observacionesDisc: datos.observacionesDisc || {},
        temperatura: datos.temperatura || {},
        seguimiento: datos.seguimiento || {},
        preferencias_seguimiento: datos.preferencias_seguimiento || [],
        compromisos: datos.compromisos || []
      };

      const response: any = await this.visitasService.crearVisitaCompleta(datosCompletos).toPromise();

      this.idVisita = response.body.id;
      this.visitaData.visita.id = this.idVisita;
      this.accion = 'editar';

      // Actualizar URL sin recargar
      this.router.navigate(
        ['/administracion/crm/visitas/editar', this.idVisita],
        { replaceUrl: true }
      );

      // Recargar la visita completa para obtener los IDs de los visitantes
      this.cargarVisita();

      console.log('✅ Visita creada automáticamente con ID:', this.idVisita);

      Swal.fire({
        icon: 'success',
        title: '¡Visita creada!',
        text: 'Ahora puedes continuar agregando información',
        showConfirmButton: false,
        timer: 2000,
        toast: true,
        position: 'top-end'
      });

    } catch (error) {
      console.error('❌ Error al crear visita automáticamente:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo crear la visita',
        confirmButtonColor: '#FFD700'
      });
    }
  }
  cancelar(): void {
    if (this.cambiosSinGuardar) {
      Swal.fire({
        title: '¿Descartar cambios?',
        text: 'Hay cambios sin guardar. ¿Desea salir de todas formas?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FFD700',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/administracion/crm/visitas']);
        }
      });
    } else {
      this.router.navigate(['/administracion/crm/visitas']);
    }
  }

  toggleMenuRapido(): void {
    this.menuRapidoAbierto = !this.menuRapidoAbierto;
  }

  navegarRapido(numeroTab: number): void {
    this.irATab(numeroTab);
    this.menuRapidoAbierto = false;
  }

  get soloLectura(): boolean {
    return this.accion === 'ver';
  }

  get textoBotonGuardar(): string {
    if (this.guardando) return 'Guardando...';
    if (!this.idVisita) return 'Crear Visita';
    return 'Guardar Cambios';
  }
}