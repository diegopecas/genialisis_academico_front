import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { HeaderComponent } from '../../../../common/header/header.component';
import { PdeAplicacionesService } from '../../../../services/pde-aplicaciones.service';
import { PdeRangosEdadService } from '../../../../services/pde-rangos-edad.service';
import { PdeItemsService } from '../../../../services/pde-items.service';
import { PdeConfiguracionService } from '../../../../services/pde-configuracion.service';
import { UtilService } from '../../../../common/constantes/util.service';

interface BloqueRango {
  idRango: string;
  nombreRango: string;
  ordenRango: number;
  items: any[];
  puntajes: { [idItem: string]: number };
  guardado: boolean;
  porcentaje: number;
  semaforo: string;
}

interface EstadoEsfera {
  idEsfera: string;
  nombreEsfera: string;
  bloques: BloqueRango[];
  cerrada: boolean;
  sinMasRangos: boolean;
  abierta: boolean;
  indice: number | null;
  edadDesarrollo: number | null;
  cargandoSiguiente: boolean;
}

@Component({
  selector: 'app-aplicar-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './aplicar-perfil.component.html',
  styleUrl: './aplicar-perfil.component.scss'
})
export class AplicarPerfilComponent implements OnInit, OnDestroy {

  titulo = 'Aplicar Perfil de Desarrollo';

  public idEstudiante = '';
  public idAplicacion = '';
  public nombreEstudiante = '';
  public edadMeses = 0;
  public edadDias = 0;
  public fechaAplicacion = '';

  public rangos: any[] = [];
  public esferas: any[] = [];
  public config: any = null;

  public idRangoInicio = '';
  public resumenAsumidos: any = null;

  public estados: EstadoEsfera[] = [];

  public paso: 'configuracion' | 'aplicacion' = 'configuracion';
  public cargando = true;
  public guardando = false;
  public observaciones = '';

  public indiceGlobal: number | null = null;
  public edadDesarrolloPromedio: number | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private pdeAplicacionesService: PdeAplicacionesService,
    private pdeRangosEdadService: PdeRangosEdadService,
    private pdeItemsService: PdeItemsService,
    private pdeConfiguracionService: PdeConfiguracionService,
    private utilService: UtilService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.idEstudiante = this.route.snapshot.params['idEstudiante'];
    const retomar = this.route.snapshot.queryParams['retomar'];

    this.cargarCatalogos(retomar);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // --- CARGA INICIAL ---

  cargarCatalogos(retomar: string | undefined): void {
    this.cargando = true;

    const subConfig = this.pdeConfiguracionService.obtenerVigente().subscribe({
      next: (res: any) => {
        this.config = res.body;
        this.cargarRangos(retomar);
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Configuración faltante', 'Esta institución no tiene configurado el Perfil de Desarrollo. Contacte al administrador.', 'error');
        this.router.navigate(['/operaciones/perfil-desarrollo']);
      }
    });
    this.subscriptions.push(subConfig);
  }

  cargarRangos(retomar: string | undefined): void {
    const sub = this.pdeRangosEdadService.obtenerTodosList().subscribe({
      next: (res: any) => {
        this.rangos = res.body as any[];
        this.cargarEsferas(retomar);
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los rangos de edad', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  // Solo las esferas que tienen items cargados; el catalogo general puede tener mas.
  cargarEsferas(retomar: string | undefined): void {
    const sub = this.pdeItemsService.obtenerEsferasConItems().subscribe({
      next: (res: any) => {
        this.esferas = res.body as any[];

        if (this.esferas.length === 0) {
          this.cargando = false;
          Swal.fire('Instrumento sin ítems', 'No hay ítems cargados para ninguna esfera. Revise el catálogo antes de aplicar.', 'warning');
          this.router.navigate(['/operaciones/perfil-desarrollo']);
          return;
        }

        if (retomar) {
          this.cargarParaRetomar(retomar);
        } else {
          this.calcularEdad();
        }
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar las esferas del instrumento', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  calcularEdad(): void {
    const sub = this.pdeAplicacionesService.calcularEdad(this.idEstudiante).subscribe({
      next: (res: any) => {
        const data = res.body;
        this.nombreEstudiante = data.nombre_estudiante;
        this.edadMeses = data.edad_meses;
        this.edadDias = data.edad_dias;
        this.fechaAplicacion = this.utilService.obtenerFechaActual();

        if (data.rango_sugerido) {
          this.idRangoInicio = data.rango_sugerido.id;
          this.consultarResumenAsumidos();
        }

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo calcular la edad del estudiante', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  cargarParaRetomar(idAplicacion: string): void {
    const sub = this.pdeAplicacionesService.retomar(idAplicacion).subscribe({
      next: (res: any) => {
        const data = res.body;
        const aplicacion = data.aplicacion;

        this.idAplicacion = aplicacion.id;
        this.nombreEstudiante = aplicacion.nombre_estudiante;
        this.edadMeses = aplicacion.edad_meses;
        this.edadDias = aplicacion.edad_dias;
        this.fechaAplicacion = aplicacion.fecha_aplicacion;
        this.idRangoInicio = aplicacion.id_rango_inicio;
        this.observaciones = aplicacion.observaciones || '';
        this.indiceGlobal = aplicacion.indice_global !== null ? Number(aplicacion.indice_global) : null;
        this.edadDesarrolloPromedio = aplicacion.edad_desarrollo_promedio !== null ? Number(aplicacion.edad_desarrollo_promedio) : null;

        this.paso = 'aplicacion';
        this.reconstruirEstados(data.puntajes, data.esferas);
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar la aplicación para retomarla', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  // Rearma los bloques ya aplicados a partir de los puntajes guardados.
  reconstruirEstados(puntajes: any[], esferasGuardadas: any[]): void {
    this.estados = this.esferas.map(esfera => ({
      idEsfera: esfera.id,
      nombreEsfera: esfera.nombre,
      bloques: [],
      cerrada: false,
      sinMasRangos: false,
      abierta: false,
      indice: null,
      edadDesarrollo: null,
      cargandoSiguiente: false
    }));

    esferasGuardadas.forEach((guardada: any) => {
      const estado = this.estados.find(e => e.idEsfera === guardada.id_esfera);
      if (estado) {
        estado.indice = Number(guardada.indice);
        estado.edadDesarrollo = Number(guardada.edad_desarrollo_meses);
      }
    });

    const aplicados = puntajes.filter((p: any) => p.asumido == 0);
    const combinaciones: { idEsfera: string, idRango: string }[] = [];

    aplicados.forEach((p: any) => {
      const existe = combinaciones.some(c => c.idEsfera === p.id_esfera && c.idRango === p.id_rango_edad);
      if (!existe) {
        combinaciones.push({ idEsfera: p.id_esfera, idRango: p.id_rango_edad });
      }
    });

    if (combinaciones.length === 0) {
      this.cargando = false;
      return;
    }

    let pendientes = combinaciones.length;

    combinaciones.forEach(combo => {
      const sub = this.pdeItemsService.obtenerByRangoEsfera(combo.idRango, combo.idEsfera).subscribe({
        next: (res: any) => {
          const items = res.body as any[];
          const estado = this.estados.find(e => e.idEsfera === combo.idEsfera);
          const rango = this.rangos.find(r => r.id === combo.idRango);

          if (estado && rango) {
            const mapa: { [idItem: string]: number } = {};
            let obtenidos = 0;
            let posibles = 0;

            items.forEach(item => {
              const registro = aplicados.find((p: any) => p.id_item === item.id);
              const valor = registro ? Number(registro.puntaje) : 0;
              mapa[item.id] = valor;
              obtenidos += valor;
              posibles += Number(item.puntaje_maximo);
            });

            const porcentaje = posibles > 0 ? (obtenidos / posibles) * 100 : 0;

            estado.bloques.push({
              idRango: rango.id,
              nombreRango: rango.nombre,
              ordenRango: Number(rango.orden),
              items: items,
              puntajes: mapa,
              guardado: true,
              porcentaje: Math.round(porcentaje),
              semaforo: this.clasificar(porcentaje)
            });

            estado.bloques.sort((a, b) => a.ordenRango - b.ordenRango);
          }

          pendientes--;
          if (pendientes === 0) { this.cargando = false; }
        },
        error: () => {
          pendientes--;
          if (pendientes === 0) { this.cargando = false; }
        }
      });
      this.subscriptions.push(sub);
    });
  }

  // --- PASO DE CONFIGURACION ---

  consultarResumenAsumidos(): void {
    if (!this.idRangoInicio) {
      this.resumenAsumidos = null;
      return;
    }

    const sub = this.pdeAplicacionesService.obtenerResumenAsumidos(this.idRangoInicio).subscribe({
      next: (res: any) => { this.resumenAsumidos = res.body; },
      error: () => { this.resumenAsumidos = null; }
    });
    this.subscriptions.push(sub);
  }

  async iniciarAplicacion(): Promise<void> {
    if (!this.idRangoInicio) {
      Swal.fire('Advertencia', 'Debe seleccionar el rango de inicio', 'warning');
      return;
    }

    const total = this.resumenAsumidos ? this.resumenAsumidos.total_items_asumidos : 0;
    const confirmacion = await Swal.fire({
      title: '¿Iniciar la aplicación?',
      html: `Se darán por logrados <strong>${total}</strong> ítem(s) de los rangos inferiores, sin aplicarlos.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, iniciar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) { return; }

    this.guardando = true;
    const data = {
      id_estudiante: this.idEstudiante,
      fecha_aplicacion: this.fechaAplicacion,
      edad_meses: this.edadMeses,
      edad_dias: this.edadDias,
      id_rango_inicio: this.idRangoInicio,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    const sub = this.pdeAplicacionesService.iniciar(data).subscribe({
      next: (res: any) => {
        this.idAplicacion = res.id;
        this.paso = 'aplicacion';
        this.prepararEstados();
        this.guardando = false;
      },
      error: () => {
        this.guardando = false;
        Swal.fire('Error', 'No se pudo iniciar la aplicación', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  prepararEstados(): void {
    this.estados = this.esferas.map(esfera => ({
      idEsfera: esfera.id,
      nombreEsfera: esfera.nombre,
      bloques: [],
      cerrada: false,
      sinMasRangos: false,
      abierta: false,
      indice: null,
      edadDesarrollo: null,
      cargandoSiguiente: false
    }));

    this.estados.forEach(estado => this.cargarSiguienteRango(estado));
  }

  // --- APLICACION ---

  cargarSiguienteRango(estado: EstadoEsfera): void {
    const siguiente = this.obtenerRangoSiguiente(estado);

    if (!siguiente) {
      estado.cerrada = true;
      return;
    }

    estado.cargandoSiguiente = true;
    const sub = this.pdeItemsService.obtenerByRangoEsfera(siguiente.id, estado.idEsfera).subscribe({
      next: (res: any) => {
        const items = res.body as any[];
        estado.cargandoSiguiente = false;

        if (items.length === 0) {
          estado.cerrada = true;
          estado.sinMasRangos = true;
          return;
        }

        const mapa: { [idItem: string]: number } = {};
        items.forEach(item => { mapa[item.id] = 0; });

        estado.bloques.push({
          idRango: siguiente.id,
          nombreRango: siguiente.nombre,
          ordenRango: Number(siguiente.orden),
          items: items,
          puntajes: mapa,
          guardado: false,
          porcentaje: 0,
          semaforo: ''
        });

        estado.abierta = true;
      },
      error: () => {
        estado.cargandoSiguiente = false;
        Swal.fire('Error', 'No se pudieron cargar los ítems del rango', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  obtenerRangoSiguiente(estado: EstadoEsfera): any {
    const ordenados = [...this.rangos].sort((a, b) => Number(a.orden) - Number(b.orden));
    const rangoInicio = ordenados.find(r => r.id === this.idRangoInicio);

    if (!rangoInicio) { return null; }

    if (estado.bloques.length === 0) {
      return rangoInicio;
    }

    const ultimoOrden = estado.bloques[estado.bloques.length - 1].ordenRango;
    return ordenados.find(r => Number(r.orden) === ultimoOrden + 1) || null;
  }

  fijarPuntaje(bloque: BloqueRango, idItem: string, valor: number): void {
    if (bloque.guardado) { return; }
    bloque.puntajes[idItem] = valor;
  }

  escalaItem(item: any): number[] {
    const maximo = Number(item.puntaje_maximo);
    const valores: number[] = [];
    for (let i = 0; i <= maximo; i++) { valores.push(i); }
    return valores;
  }

  etiquetaPuntaje(valor: number, maximo: number): string {
    if (valor === 0) { return 'No'; }
    if (valor === maximo) { return 'Solo'; }
    return 'Apoyo';
  }

  clasificar(porcentaje: number): string {
    if (!this.config) { return ''; }
    if (porcentaje >= Number(this.config.umbral_verde)) { return 'verde'; }
    if (porcentaje >= Number(this.config.umbral_amarillo)) { return 'amarillo'; }
    return 'rojo';
  }

  guardarBloque(estado: EstadoEsfera, bloque: BloqueRango): void {
    const items = bloque.items.map(item => ({
      id_item: item.id,
      puntaje: bloque.puntajes[item.id]
    }));

    this.guardando = true;
    const sub = this.pdeAplicacionesService.guardarRango({
      id_aplicacion: this.idAplicacion,
      id_esfera: estado.idEsfera,
      id_rango_edad: bloque.idRango,
      items: items
    }).subscribe({
      next: (res: any) => {
        this.guardando = false;
        bloque.guardado = true;
        bloque.porcentaje = Math.round(Number(res.porcentaje));
        bloque.semaforo = res.semaforo;

        estado.indice = Number(res.esfera.indice);
        estado.edadDesarrollo = Number(res.esfera.edad_desarrollo_meses);

        if (res.global) {
          this.indiceGlobal = res.global.indice_global !== null ? Number(res.global.indice_global) : null;
          this.edadDesarrolloPromedio = res.global.edad_desarrollo_promedio !== null ? Number(res.global.edad_desarrollo_promedio) : null;
        }

        if (res.sugerir_parar) {
          this.preguntarSiContinuar(estado, bloque);
        }
      },
      error: () => {
        this.guardando = false;
        Swal.fire('Error', 'No se pudo guardar el rango', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  async preguntarSiContinuar(estado: EstadoEsfera, bloque: BloqueRango): Promise<void> {
    const resultado = await Swal.fire({
      title: 'Conviene detenerse aquí',
      html: `En <strong>${estado.nombreEsfera}</strong> el rango ${bloque.nombreRango} quedó en ${bloque.porcentaje}%. ` +
            `Seguir con rangos superiores no aporta información y cansa al niño.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Cerrar esta esfera',
      cancelButtonText: 'Continuar de todos modos'
    });

    if (resultado.isConfirmed) {
      estado.cerrada = true;
    }
  }

  cerrarEsfera(estado: EstadoEsfera): void {
    if (this.bloquePendiente(estado)) {
      Swal.fire(
        'Rango sin guardar',
        `Guarde el rango de ${estado.nombreEsfera} antes de cerrar la esfera. Si no lo aplicó, deje los ítems en No y guarde igual.`,
        'warning'
      );
      return;
    }
    estado.cerrada = true;
  }

  reabrirEsfera(estado: EstadoEsfera): void {
    estado.cerrada = false;
  }

  toggleEsfera(estado: EstadoEsfera): void {
    estado.abierta = !estado.abierta;
  }

  bloquePendiente(estado: EstadoEsfera): boolean {
    return estado.bloques.some(b => !b.guardado);
  }

  puedeFinalizar(): boolean {
    const conDatos = this.estados.filter(e => e.bloques.some(b => b.guardado));
    const pendientes = this.estados.some(e => this.bloquePendiente(e));
    return conDatos.length > 0 && !pendientes;
  }

  // Explica en pantalla por que el boton de finalizar esta deshabilitado.
  motivoNoFinalizar(): string {
    const pendientes = this.estados.filter(e => this.bloquePendiente(e));

    if (pendientes.length > 0) {
      const nombres = pendientes.map(e => e.nombreEsfera).join(', ');
      return `Falta guardar el rango en: ${nombres}.`;
    }

    const conDatos = this.estados.filter(e => e.bloques.some(b => b.guardado));
    if (conDatos.length === 0) {
      return 'Debe guardar al menos un rango antes de finalizar.';
    }

    return '';
  }

  async finalizar(): Promise<void> {
    if (!this.puedeFinalizar()) {
      Swal.fire('Advertencia', 'Hay rangos sin guardar o ninguna esfera tiene datos', 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      title: '¿Finalizar la aplicación?',
      text: 'Después de finalizar el resultado queda disponible en el informe del estudiante.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar'
    });

    if (!confirmacion.isConfirmed) { return; }

    this.guardando = true;
    const sub = this.pdeAplicacionesService.finalizar({
      id: this.idAplicacion,
      observaciones: this.observaciones
    }).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('Éxito', 'Aplicación finalizada', 'success');
        this.router.navigate(['/operaciones/perfil-desarrollo']);
      },
      error: () => {
        this.guardando = false;
        Swal.fire('Error', 'No se pudo finalizar la aplicación', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  volver(): void {
    this.router.navigate(['/operaciones/perfil-desarrollo']);
  }

  claseSemaforo(semaforo: string): string {
    return { 'verde': 'sem-verde', 'amarillo': 'sem-amarillo', 'rojo': 'sem-rojo' }[semaforo] || '';
  }

  claseIndice(indice: number | null): string {
    if (indice === null) { return 'idx-neutro'; }
    if (indice >= 95) { return 'idx-verde'; }
    if (indice >= 80) { return 'idx-amarillo'; }
    return 'idx-rojo';
  }

  redondear(valor: number | null): string {
    if (valor === null) { return '-'; }
    return `${Math.round(valor)}`;
  }
}
