import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { InformesEstudiantesService } from '../../../../services/informes-estudiantes.service';
import { InformesConfiguracionService } from '../../../../services/informes-configuracion.service';
import { ValoresParametrosCalificacionesService } from '../../../../services/valores-parametros-calificaciones.service';
import { GruposService } from '../../../../services/grupos.service';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import { AuthService } from '../../../../services/auth.service';
import { ExportarPdfInformeService } from '../../../../services/exportar-pdf-informe.service';
import Swal from 'sweetalert2';

/**
 * Generación y calificación de informes en una sola pantalla.
 *
 * La lista de estudiantes se queda viva a un lado y el informe del
 * seleccionado se carga al lado: cambiar de estudiante no recarga la lista
 * ni la escala, que era lo que hacía lenta la navegación entre pantallas.
 */
@Component({
  selector: 'app-informes-generacion',
  templateUrl: './informes-generacion.component.html',
  styleUrl: './informes-generacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class InformesGeneracionComponent implements OnInit {

  titulo = "Generación de Informes";
  regresar = '/academico';

  grupos: any[] = [];
  cortes: any[] = [];

  idGrupo: any = null;
  idCorte: any = null;

  estudiantes: any[] = [];
  cargando = false;
  consultado = false;

  // ===== Informe abierto =====
  // La escala se carga una sola vez por pantalla, no por informe.
  valores: any[] = [];
  escalaLista = false;

  estudianteActivo: any = null;
  informe: any = null;
  secciones: any[] = [];
  cargandoInforme = false;

  // Los botones de marcar en masa solo llenan lo vacio por defecto: asi no
  // se pierden las excepciones que ya se corrigieron a mano.
  sobrescribir = false;

  // Deshacer de un paso para las acciones en masa, que son las que borran
  // mucho de un golpe. Guarda el valor que tenia cada fila antes.
  private respaldo: { id: string, valor: any }[] | null = null;
  // El deshacer tambien cubre los textos: se guardan aparte porque no
  // cuelgan de una fila calificada sino del estudiante.
  private respaldoTextos: { id_informe: string, texto: any }[] | null = null;
  respaldoDescripcion = '';

  // Texto base para rellenar las observaciones de todo el grupo
  textoBase = '';

  // Configuración del jardín: la necesita el PDF para el encabezado,
  // el pie y las firmas.
  configuracion: any = null;
  private logoBase64 = '';
  descargando = false;
  descargandoTodos = false;
  progresoDescarga = 0;

  // ===== Vista masiva =====
  // 'estudiante' califica un niño completo; 'seccion' califica una sección
  // para todo el grupo de una sentada.
  vista: 'estudiante' | 'seccion' | 'descargas' = 'estudiante';
  seccionesGrupo: any[] = [];
  idSeccion: any = null;
  seccionActiva: any = null;
  columnas: any[] = [];
  estudiantesMasivo: any[] = [];
  cargandoMasivo = false;

  constructor(
    private informesEstudiantesService: InformesEstudiantesService,
    private informesConfiguracionService: InformesConfiguracionService,
    private valoresService: ValoresParametrosCalificacionesService,
    private gruposService: GruposService,
    private cortesAcademicosService: CortesAcademicosService,
    private authService: AuthService,
    private exportarPdfInformeService: ExportarPdfInformeService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarEscala();

    // El logo se carga una sola vez: lo usan todos los PDF del grupo
    this.exportarPdfInformeService.cargarLogoBase64().then(logo => {
      this.logoBase64 = logo;
    });

    // El grupo y el corte viajan en la URL para poder volver al filtro
    this.route.queryParams.subscribe(params => {
      if (params['grupo'] && params['corte']) {
        this.idGrupo = params['grupo'];
        this.idCorte = params['corte'];
        this.consultar();
      }
    });
  }

  // =================================================================
  // CATÁLOGOS
  // =================================================================

  cargarCatalogos() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los grupos", error)
    });

    this.cortesAcademicosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cortes = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los cortes", error)
    });
  }

  /**
   * La escala del informe es la del parámetro marcado en la configuración
   * del jardín, no todos los parámetros.
   */
  cargarEscala() {
    this.informesConfiguracionService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.configuracion = body.length > 0 ? body[0] : null;
        const idParametro = this.configuracion ? this.configuracion.id_parametro_evaluacion : null;

        if (!idParametro) {
          Swal.fire(
            'Falta configuración',
            'Este jardín no tiene definido el parámetro de evaluación del informe. Configúralo en Académico → Informes → Configuración del Informe.',
            'warning'
          );
          return;
        }

        this.valoresService.obtenerByParametro(idParametro).subscribe({
          next: (resp: any) => {
            const valores = (resp.body as any[]) || [];
            // El orden de presentación manda sobre el valor numérico
            this.valores = valores.sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
            this.escalaLista = true;
          },
          error: (error: any) => console.error("Error al cargar los valores del parámetro", error)
        });
      },
      error: (error: any) => console.error("Error al cargar la configuración del informe", error)
    });
  }

  // =================================================================
  // LISTA
  // =================================================================

  /** Deja la selección en la URL para poder volver a ella */
  buscar() {
    if (!this.idGrupo || !this.idCorte) {
      Swal.fire('Advertencia', 'Selecciona el grupo y el corte', 'warning');
      return;
    }

    this.cerrarInforme();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { grupo: this.idGrupo, corte: this.idCorte },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Una sola consulta trae los informes completos del grupo. De ahí en
   * adelante cambiar de estudiante, de vista o de sección no vuelve al
   * servidor: todo sale de esta copia en memoria.
   */
  consultar() {
    if (!this.idGrupo || !this.idCorte) {
      return;
    }

    this.cargando = true;
    this.informesEstudiantesService.obtenerGrupoCompleto(this.idGrupo, this.idCorte).subscribe({
      next: (response: any) => {
        this.estudiantes = (response.body as any[]) || [];
        this.cargando = false;
        this.consultado = true;
        this.cargarSeccionesGrupo();

        // Si había un estudiante abierto, se vuelve a apuntar a su copia
        // nueva para no quedar trabajando sobre datos viejos.
        if (this.estudianteActivo) {
          const mismo = this.estudiantes.find(e => e.id_estudiante === this.estudianteActivo.id_estudiante);
          if (mismo) {
            this.abrirInforme(mismo);
          } else {
            this.cerrarInforme();
          }
        }
      },
      error: (error: any) => {
        console.error("Error al consultar el estado de los informes", error);
        this.cargando = false;
        this.consultado = true;
        Swal.fire('Error', 'No se pudo consultar el estado de los informes', 'error');
      }
    });
  }

  /**
   * Refresca solo la fila del estudiante, sin volver a pedir toda la lista.
   */
  /**
   * Recalcula el avance de un estudiante desde sus propias secciones, sin
   * volver al servidor. Las informativas no cuentan.
   */
  private recalcularAvance(est: any) {
    let total = 0;
    let calificadas = 0;

    (est.secciones || []).forEach((sec: any) => {
      if (sec.se_califica != 1) {
        return;
      }
      (sec.filas || []).forEach((f: any) => {
        total++;
        if (f.id_valor_parametro) {
          calificadas++;
        }
      });
    });

    est.filas_total = total;
    est.filas_calificadas = calificadas;
  }

  private refrescarFila(idEstudiante: any, cambios: any) {
    const fila = this.estudiantes.find(e => e.id_estudiante === idEstudiante);
    if (fila) {
      Object.assign(fila, cambios);
    }
  }

  porcentaje(est: any): number {
    if (!est.filas_total || est.filas_total == 0) {
      return 0;
    }
    return Math.round((est.filas_calificadas * 100) / est.filas_total);
  }

  etiquetaEstado(estado: string): string {
    const etiquetas: any = {
      'sin_generar': 'Sin generar',
      'borrador': 'En borrador',
      'confirmado': 'Confirmado',
      'publicado': 'Publicado'
    };
    return etiquetas[estado] || estado;
  }

  // =================================================================
  // GENERAR
  // =================================================================

  generar(est: any, abrirDespues: boolean = false) {
    const usuario = this.authService.getUsuarioActual();

    this.informesEstudiantesService.generar({
      id_estudiante: est.id_estudiante,
      id_corte_academico: this.idCorte,
      id_usuario: usuario?.id || null
    }).subscribe({
      next: () => {
        // El estado se marca de una, antes de refrescar la lista: si se
        // espera a consultar(), el estudiante sigue en 'sin_generar' y
        // abrirInforme vuelve a llamar a generar en un bucle infinito.
        est.estado = 'borrador';
        this.refrescarFila(est.id_estudiante, { estado: 'borrador' });

        this.consultar();

        if (abrirDespues) {
          this.abrirInforme(est);
        }
      },
      error: (error: any) => {
        console.error("Error al generar el informe", error);
        Swal.fire('Error', 'No se pudo generar el informe', 'error');
      }
    });
  }

  /**
   * Genera los que no existen y recompleta los que están en borrador.
   *
   * El backend solo agrega las filas que faltan, así que lo ya calificado
   * nunca se pierde. Los confirmados se dejan por fuera a propósito.
   */
  async generarTodos() {
    const sinGenerar = this.estudiantes.filter(e => e.estado === 'sin_generar');
    const borradores = this.estudiantes.filter(e => e.estado === 'borrador');
    const pendientes = [...sinGenerar, ...borradores];

    if (pendientes.length === 0) {
      Swal.fire('Todo listo', 'No hay informes por generar ni por completar.', 'info');
      return;
    }

    const detalle: string[] = [];
    if (sinGenerar.length > 0) {
      detalle.push(`${sinGenerar.length} informes nuevos`);
    }
    if (borradores.length > 0) {
      detalle.push(`${borradores.length} en borrador se completan con las filas que falten`);
    }

    const result = await Swal.fire({
      title: '¿Generar los informes?',
      text: detalle.join(', ') + '. Lo ya calificado no se pierde.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, generar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();
    this.cargando = true;

    // Una sola llamada con el arreglo, no una peticion por estudiante
    this.informesEstudiantesService.generarMasivo({
      estudiantes: pendientes.map(e => e.id_estudiante),
      id_corte_academico: this.idCorte,
      id_usuario: usuario?.id || null
    }).subscribe({
      next: (respuesta: any) => {
        this.cargando = false;
        Swal.fire('Listo', `Se procesaron ${respuesta?.procesados || 0} informes.`, 'success');
        this.consultar();
      },
      error: (error: any) => {
        console.error("Error al generar los informes", error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron generar los informes', 'error');
      }
    });
  }

  // =================================================================
  // INFORME ABIERTO
  // =================================================================

  /**
   * Abre el informe desde la copia en memoria. No hay petición: las
   * secciones ya vinieron con la consulta del grupo.
   */
  abrirInforme(est: any) {
    this.limpiarRespaldo();

    if (est.estado === 'sin_generar') {
      // Se marca el intento para no reentrar si el estado no alcanza a
      // cambiar: generar y abrir se llaman en cadena.
      if (est.generando) {
        return;
      }
      est.generando = true;
      this.generar(est, true);
      return;
    }

    est.generando = false;

    this.estudianteActivo = est;
    this.cargandoInforme = false;

    // Se trabaja sobre el mismo objeto de la lista, no sobre una copia: asi
    // lo que se marca aqui se ve en la vista por sección y al revés.
    this.secciones = est.secciones || [];
    this.informe = {
      id: est.id_informe,
      estado: est.estado,
      nombre_estudiante: est.nombre_completo,
      nombre_grupo: est.nombre_grupo,
      nombre_corte: this.nombreCorte,
      ausencias: est.ausencias,
      texto_cierre: est.texto_cierre,
      id_corte_academico: this.idCorte
    };
  }

  cerrarInforme() {
    this.estudianteActivo = null;
    this.informe = null;
    this.secciones = [];
  }

  /** Índice del estudiante abierto, para las flechas de anterior y siguiente */
  private get indiceActivo(): number {
    if (!this.estudianteActivo) {
      return -1;
    }
    return this.estudiantes.findIndex(e => e.id_estudiante === this.estudianteActivo.id_estudiante);
  }

  get hayAnterior(): boolean {
    return this.indiceActivo > 0;
  }

  get haySiguiente(): boolean {
    const i = this.indiceActivo;
    return i >= 0 && i < this.estudiantes.length - 1;
  }

  anterior() {
    if (this.hayAnterior) {
      this.abrirInforme(this.estudiantes[this.indiceActivo - 1]);
    }
  }

  siguiente() {
    if (this.haySiguiente) {
      this.abrirInforme(this.estudiantes[this.indiceActivo + 1]);
    }
  }

  get editable(): boolean {
    return this.informe && this.informe.estado === 'borrador';
  }

  get seccionesRaiz(): any[] {
    return this.secciones.filter(s => !s.id_seccion_padre);
  }

  subsecciones(idPadre: any): any[] {
    return this.secciones.filter(s => s.id_seccion_padre === idPadre);
  }

  marcar(fila: any, idValor: any) {
    if (!this.editable) {
      return;
    }
    // Volver a tocar el mismo valor lo quita, por si se marcó por error
    fila.id_valor_parametro = fila.id_valor_parametro === idValor ? null : idValor;
    fila.origen = 'manual';
  }

  /**
   * Marca todas las filas de la sección y de sus subsecciones con el mismo
   * valor. Es lo que más tiempo ahorra: en un boletín de 44 filas la
   * docente suele poner el mismo valor en casi toda una dimensión y
   * corregir solo las excepciones.
   */
  marcarTodasSeccion(seccion: any, idValor: any) {
    if (!this.editable) {
      return;
    }

    const afectadas = (seccion.filas || []).concat(
      ...this.subsecciones(seccion.id).map((sub: any) => sub.filas || []));
    this.respaldar(afectadas, `Marcar todas en ${seccion.nombre}`);

    const aplicar = (sec: any) => {
      if (!sec.se_califica) {
        return;
      }
      (sec.filas || []).forEach((f: any) => {
        if (!this.sobrescribir && f.id_valor_parametro) {
          return;
        }
        f.id_valor_parametro = idValor;
        f.origen = 'manual';
      });
    };

    aplicar(seccion);
    this.subsecciones(seccion.id).forEach(aplicar);
  }

  /**
   * Marca de una todas las filas del informe, en todas las secciones que se
   * califican. Respeta el interruptor de sobrescribir, así que por defecto
   * solo llena lo que está vacío.
   */
  marcarTodoElInforme(idValor: any) {
    if (!this.editable) {
      return;
    }

    const afectadas = this.secciones
      .filter(s => s.se_califica == 1)
      .reduce((acc: any[], s: any) => acc.concat(s.filas || []), []);
    this.respaldar(afectadas, 'Marcar todo el informe');

    afectadas.forEach((f: any) => {
      if (!this.sobrescribir && f.id_valor_parametro) {
        return;
      }
      f.id_valor_parametro = idValor;
      f.origen = 'manual';
    });
  }

  /** Quita todas las marcas del informe */
  limpiarTodoElInforme() {
    if (!this.editable) {
      return;
    }

    const afectadas = this.secciones
      .filter(s => s.se_califica == 1)
      .reduce((acc: any[], s: any) => acc.concat(s.filas || []), []);
    this.respaldar(afectadas, 'Limpiar todo el informe');

    afectadas.forEach((f: any) => {
      f.id_valor_parametro = null;
    });
  }

  limpiarSeccion(seccion: any) {
    if (!this.editable) {
      return;
    }

    const afectadas = (seccion.filas || []).concat(
      ...this.subsecciones(seccion.id).map((sub: any) => sub.filas || []));
    this.respaldar(afectadas, `Limpiar ${seccion.nombre}`);

    const limpiar = (sec: any) => {
      (sec.filas || []).forEach((f: any) => {
        f.id_valor_parametro = null;
      });
    };

    limpiar(seccion);
    this.subsecciones(seccion.id).forEach(limpiar);
  }

  avanceSeccion(seccion: any): { calificadas: number, total: number } {
    let total = 0;
    let calificadas = 0;

    const contar = (sec: any) => {
      if (sec.se_califica != 1) {
        return;
      }
      (sec.filas || []).forEach((f: any) => {
        total++;
        if (f.id_valor_parametro) {
          calificadas++;
        }
      });
    };

    contar(seccion);
    this.subsecciones(seccion.id).forEach(contar);

    return { calificadas, total };
  }

  /**
   * Solo cuentan las secciones que se califican: las informativas listan
   * sus filas pero no llevan marca, y contarlas dejaba el informe imposible
   * de confirmar.
   */
  get totalFilas(): number {
    return this.secciones
      .filter(s => s.se_califica == 1)
      .reduce((acc, s) => acc + (s.filas?.length || 0), 0);
  }

  get filasCalificadas(): number {
    return this.secciones
      .filter(s => s.se_califica == 1)
      .reduce((acc, s) => acc + (s.filas?.filter((f: any) => f.id_valor_parametro).length || 0), 0);
  }

  /** Arma el cuerpo que espera el backend */
  private armarPayload(): any {
    const detalle: any[] = [];
    const textos: any[] = [];

    this.secciones.forEach(s => {
      (s.filas || []).forEach((f: any) => {
        detalle.push({
          id: f.id,
          id_valor_parametro: f.id_valor_parametro || null,
          origen: f.origen || 'manual'
        });
      });

      if (s.tipo_contenido === 'texto' || (s.texto !== null && s.texto !== undefined)) {
        textos.push({ id_seccion: s.id, texto: s.texto || '' });
      }
    });

    return {
      id_informe: this.informe.id,
      detalle: detalle,
      textos: textos,
      texto_cierre: this.informe.texto_cierre || null
    };
  }

  guardar() {
    if (!this.informe) {
      return;
    }

    this.informesEstudiantesService.guardar(this.armarPayload()).subscribe({
      next: () => {
        // Las secciones son las mismas de la lista, así que ya están al día.
        // Solo se recalcula el avance para la barra del panel.
        this.refrescarFila(this.estudianteActivo.id_estudiante, {
          filas_calificadas: this.filasCalificadas,
          filas_total: this.totalFilas,
          texto_cierre: this.informe.texto_cierre
        });
        Swal.fire('Guardado', 'El informe se guardó correctamente', 'success');
      },
      error: (error: any) => {
        console.error("Error al guardar el informe", error);
        const mensaje = error?.error?.error || 'No se pudo guardar el informe';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  async confirmar() {
    const faltantes = this.totalFilas - this.filasCalificadas;

    if (faltantes > 0) {
      Swal.fire('Faltan calificaciones', `Quedan ${faltantes} filas sin calificar.`, 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Confirmar el informe?',
      text: 'Después de confirmarlo no se puede modificar sin reabrirlo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, confirmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();

    // Se guarda antes de confirmar, para no perder lo que esté sin guardar
    this.informesEstudiantesService.guardar(this.armarPayload()).subscribe({
      next: () => {
        this.informesEstudiantesService.confirmar({
          id_informe: this.informe.id,
          id_usuario: usuario?.id || null
        }).subscribe({
          next: () => {
            this.informe.estado = 'confirmado';
            this.refrescarFila(this.estudianteActivo.id_estudiante, {
              estado: 'confirmado',
              filas_calificadas: this.filasCalificadas,
              filas_total: this.totalFilas
            });
            Swal.fire('Confirmado', 'El informe quedó confirmado', 'success');
          },
          error: (error: any) => {
            console.error("Error al confirmar el informe", error);
            const mensaje = error?.error?.error || 'No se pudo confirmar el informe';
            Swal.fire('Error', mensaje, 'error');
          }
        });
      },
      error: (error: any) => {
        console.error("Error al guardar antes de confirmar", error);
        Swal.fire('Error', 'No se pudo guardar el informe', 'error');
      }
    });
  }

  async reabrir() {
    const result = await Swal.fire({
      title: '¿Reabrir el informe?',
      text: 'Volverá a estado borrador para poder corregirlo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.informesEstudiantesService.reabrir({ id_informe: this.informe.id }).subscribe({
      next: () => {
        this.informe.estado = 'borrador';
        this.refrescarFila(this.estudianteActivo.id_estudiante, { estado: 'borrador' });
      },
      error: (error: any) => {
        console.error("Error al reabrir el informe", error);
        Swal.fire('Error', 'No se pudo reabrir el informe', 'error');
      }
    });
  }

  /**
   * Vuelve a sembrar las filas que falten. No pisa lo ya calificado: sirve
   * cuando cambia la configuración de secciones o la malla del corte.
   */
  async regenerar() {
    const result = await Swal.fire({
      title: '¿Regenerar el informe?',
      text: 'Se agregan las filas que falten según la configuración actual. Lo que ya está calificado no se pierde.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, regenerar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    const usuario = this.authService.getUsuarioActual();
    const est = this.estudianteActivo;

    this.informesEstudiantesService.generar({
      id_estudiante: est.id_estudiante,
      id_corte_academico: this.idCorte,
      id_usuario: usuario?.id || null
    }).subscribe({
      next: (respuesta: any) => {
        // Regenerar agrega filas nuevas, así que aquí sí hay que releer
        this.consultar();
        const nuevas = respuesta?.filas_nuevas || 0;
        Swal.fire('Listo', nuevas > 0
          ? `Se agregaron ${nuevas} filas al informe.`
          : 'El informe ya estaba completo.', 'success');
      },
      error: (error: any) => {
        console.error("Error al regenerar el informe", error);
        Swal.fire('Error', 'No se pudo regenerar el informe', 'error');
      }
    });
  }

  // =================================================================
  // DESHACER
  // =================================================================

  /** Guarda el valor actual de las filas antes de una acción en masa */
  private respaldar(filas: any[], descripcion: string) {
    this.respaldo = filas.map(f => ({ id: f.id, valor: f.id_valor_parametro }));
    this.respaldoDescripcion = descripcion;
  }

  /** Guarda el texto actual de cada estudiante antes de rellenar en masa */
  private respaldarTextos(descripcion: string) {
    this.respaldoTextos = this.estudiantesMasivo.map(e => ({
      id_informe: e.id_informe,
      texto: e.texto
    }));
    this.respaldoDescripcion = descripcion;
  }

  get hayDeshacer(): boolean {
    return (this.respaldo !== null && this.respaldo.length > 0)
        || (this.respaldoTextos !== null && this.respaldoTextos.length > 0);
  }

  /** Todas las filas que hay en pantalla, según la vista activa */
  private filasEnPantalla(): any[] {
    if (this.vista === 'seccion') {
      return this.estudiantesMasivo.reduce(
        (acc: any[], est: any) => acc.concat(est.filas || []), []);
    }
    return this.secciones.reduce(
      (acc: any[], sec: any) => acc.concat(sec.filas || []), []);
  }

  deshacer() {
    if (this.respaldo) {
      const porId = new Map(this.respaldo.map(r => [r.id, r.valor]));
      this.filasEnPantalla().forEach((f: any) => {
        if (porId.has(f.id)) {
          f.id_valor_parametro = porId.get(f.id);
        }
      });
    }

    if (this.respaldoTextos) {
      const porInforme = new Map(this.respaldoTextos.map(r => [r.id_informe, r.texto]));
      this.estudiantesMasivo.forEach((e: any) => {
        if (porInforme.has(e.id_informe)) {
          e.texto = porInforme.get(e.id_informe);
        }
      });
    }

    this.limpiarRespaldo();
  }

  private limpiarRespaldo() {
    this.respaldo = null;
    this.respaldoTextos = null;
    this.respaldoDescripcion = '';
  }

  // =================================================================
  // VISTA MASIVA POR SECCIÓN
  // =================================================================

  cambiarVista(vista: 'estudiante' | 'seccion' | 'descargas') {
    this.vista = vista;
    this.limpiarRespaldo();

    if (vista === 'seccion') {
      this.cerrarInforme();
      if (this.seccionesGrupo.length === 0 && this.idGrupo) {
        this.cargarSeccionesGrupo();
      }
    }
  }

  cargarSeccionesGrupo() {
    this.informesEstudiantesService.obtenerSeccionesPorGrupo(this.idGrupo).subscribe({
      next: (response: any) => {
        this.seccionesGrupo = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar las secciones del grupo", error)
    });
  }

  /** Nombre con la dimensión adelante, para distinguir las asignaturas */
  nombreSeccion(sec: any): string {
    return sec.nombre_seccion_padre
      ? `${sec.nombre_seccion_padre} · ${sec.nombre}`
      : sec.nombre;
  }

  /**
   * Arma la vista por sección desde la copia en memoria. Las filas son las
   * mismas del informe de cada estudiante, no copias: marcar aquí se ve al
   * abrir el estudiante y al revés.
   */
  cargarSeccionMasiva() {
    if (!this.idSeccion) {
      this.seccionActiva = null;
      this.columnas = [];
      this.estudiantesMasivo = [];
      return;
    }

    this.limpiarRespaldo();
    this.textoBase = '';

    // El texto de cierre no es una sección: vive en el maestro
    if (this.idSeccion === 'cierre') {
      this.seccionActiva = {
        id: 'cierre',
        nombre: 'Observaciones generales',
        se_califica: 0,
        tipo_contenido: 'texto',
        evalua_a: 'estudiante'
      };
      this.columnas = [];
      this.estudiantesMasivo = this.estudiantes
        .filter(e => e.id_informe)
        .map(e => ({
          id_estudiante: e.id_estudiante,
          nombre_completo: e.nombre_completo,
          id_informe: e.id_informe,
          estado: e.estado,
          filas: [],
          texto: e.texto_cierre,
          ref: e
        }));
      return;
    }

    const datosSeccion = this.seccionesGrupo.find(s => s.id === this.idSeccion);
    this.seccionActiva = datosSeccion || null;
    this.columnas = [];

    this.estudiantesMasivo = this.estudiantes
      .filter(e => e.id_informe)
      .map(e => {
        const sec = (e.secciones || []).find((s: any) => s.id === this.idSeccion);
        const filas = sec ? (sec.filas || []) : [];

        // Las columnas salen del primer estudiante que tenga filas: todos
        // los del mismo grado comparten las mismas.
        if (this.columnas.length === 0 && filas.length > 0) {
          this.columnas = filas.map((f: any) => ({
            id_fila: f.id_fila,
            tipo_fila: f.tipo_fila,
            texto_fila: f.texto_fila,
            orden: f.orden
          }));
        }

        return {
          id_estudiante: e.id_estudiante,
          nombre_completo: e.nombre_completo,
          id_informe: e.id_informe,
          estado: e.estado,
          filas: filas,
          texto: sec ? sec.texto : null,
          ref: e,
          seccion: sec
        };
      });
  }

  /** La fila del estudiante que corresponde a esa columna */
  filaDe(est: any, columna: any): any {
    return (est.filas || []).find((f: any) => f.id_fila === columna.id_fila);
  }

  editableMasivo(est: any): boolean {
    return est.estado === 'borrador';
  }

  marcarMasivo(est: any, columna: any, idValor: any) {
    if (!this.editableMasivo(est)) {
      return;
    }
    const fila = this.filaDe(est, columna);
    if (fila) {
      fila.id_valor_parametro = fila.id_valor_parametro === idValor ? null : idValor;
    }
  }

  /**
   * Mismo valor en esa columna para todo el grupo. Solo llena lo vacío,
   * salvo que se pida sobrescribir.
   */
  marcarColumna(columna: any, idValor: any) {
    const afectadas = this.estudiantesMasivo
      .filter(est => this.editableMasivo(est))
      .map(est => this.filaDe(est, columna))
      .filter(f => !!f);
    this.respaldar(afectadas, 'Marcar columna');

    this.estudiantesMasivo.forEach(est => {
      if (!this.editableMasivo(est)) {
        return;
      }
      const fila = this.filaDe(est, columna);
      if (!fila) {
        return;
      }
      if (!this.sobrescribir && fila.id_valor_parametro) {
        return;
      }
      fila.id_valor_parametro = idValor;
    });
  }

  /** Mismo valor en toda la tabla, con la misma regla */
  marcarTodoMasivo(idValor: any) {
    const afectadas = this.estudiantesMasivo
      .filter(est => this.editableMasivo(est))
      .reduce((acc: any[], est: any) => acc.concat(est.filas || []), []);
    this.respaldar(afectadas, 'Marcar toda la tabla');

    this.estudiantesMasivo.forEach(est => {
      if (!this.editableMasivo(est)) {
        return;
      }
      (est.filas || []).forEach((f: any) => {
        if (!this.sobrescribir && f.id_valor_parametro) {
          return;
        }
        f.id_valor_parametro = idValor;
      });
    });
  }

  /**
   * Pone el texto base en las observaciones del grupo. Como en las marcas,
   * por defecto solo llena las que están vacías.
   */
  aplicarTextoBase() {
    if (!this.textoBase || this.textoBase.trim() === '') {
      Swal.fire('Advertencia', 'Escribe primero el texto que quieres aplicar', 'warning');
      return;
    }

    this.respaldarTextos('Aplicar texto a todos');

    this.estudiantesMasivo.forEach(est => {
      if (!this.editableMasivo(est)) {
        return;
      }
      const tieneTexto = est.texto && est.texto.trim() !== '';
      if (!this.sobrescribir && tieneTexto) {
        return;
      }
      est.texto = this.textoBase;
    });
  }

  /** Borra las observaciones del grupo */
  limpiarTextos() {
    this.respaldarTextos('Limpiar observaciones');

    this.estudiantesMasivo.forEach(est => {
      if (this.editableMasivo(est)) {
        est.texto = '';
      }
    });
  }

  guardarMasivo() {
    if (!this.idSeccion) {
      return;
    }

    // Se manda el arreglo completo en una sola peticion
    const payload = {
      id_seccion: this.idSeccion,
      estudiantes: this.estudiantesMasivo
        .filter(e => e.id_informe)
        .map(e => ({
          id_informe: e.id_informe,
          filas: (e.filas || []).map((f: any) => ({
            id: f.id,
            id_valor_parametro: f.id_valor_parametro || null
          })),
          texto: e.texto ?? null
        }))
    };

    this.informesEstudiantesService.guardarMasivo(payload).subscribe({
      next: (respuesta: any) => {
        // Las filas son las mismas de la lista, así que el detalle ya quedó.
        // Falta reflejar los textos y recalcular el avance de cada uno.
        this.estudiantesMasivo.forEach(e => {
          if (!e.ref) {
            return;
          }
          if (this.idSeccion === 'cierre') {
            e.ref.texto_cierre = e.texto;
          } else if (e.seccion) {
            e.seccion.texto = e.texto;
          }
          this.recalcularAvance(e.ref);
        });

        const omitidos = respuesta?.omitidos || 0;
        Swal.fire(
          'Guardado',
          omitidos > 0
            ? `Se guardaron ${respuesta.guardados} informes. ${omitidos} se omitieron por estar confirmados o sin generar.`
            : `Se guardaron ${respuesta.guardados} informes.`,
          'success'
        );
      },
      error: (error: any) => {
        console.error("Error al guardar la sección", error);
        const mensaje = error?.error?.error || 'No se pudo guardar';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  // =================================================================
  // DESCARGA DEL BOLETÍN
  // =================================================================

  /** Nombre del corte seleccionado, para el encabezado del PDF */
  private get nombreCorte(): string {
    const corte = this.cortes.find(c => c.id === this.idCorte);
    return corte ? corte.nombre : '';
  }

  /**
   * Arma el objeto que espera el servicio de PDF a partir del informe
   * cargado y de la configuración del jardín.
   */
  private armarDatosPdf(informe: any, secciones: any[]): any {
    return {
      tituloInforme:   this.configuracion?.titulo_informe,
      encabezado:      this.configuracion?.encabezado,
      piePagina:       this.configuracion?.pie_pagina,
      firmaUno:        this.configuracion?.firma_uno,
      firmaDos:        this.configuracion?.firma_dos,
      firmaAcudiente:  this.configuracion?.firma_acudiente == 1,
      muestraAusencias: this.configuracion?.muestra_ausencias == 1,
      logoBase64:      this.logoBase64,

      // Formato configurable por jardín
      estiloMarca:       this.configuracion?.estilo_marca || 'columnas',
      simboloMarca:      this.configuracion?.simbolo_marca || 'x',
      colorPrincipal:    this.configuracion?.color_principal || null,
      mostrarConvencion: this.configuracion?.mostrar_convencion != 0,

      nombreEstudiante: informe.nombre_estudiante,
      nombreGrupo:      informe.nombre_grupo,
      nombreCorte:      this.nombreCorte,
      ausencias:        informe.ausencias,
      textoCierre:      informe.texto_cierre,
      estado:           informe.estado,

      valores:   this.valores,
      secciones: secciones
    };
  }

  /** Datos del PDF de un estudiante, tomados de la copia en memoria */
  private datosPdfDe(est: any): any {
    return this.armarDatosPdf({
      nombre_estudiante: est.nombre_completo,
      nombre_grupo:      est.nombre_grupo,
      ausencias:         est.ausencias,
      texto_cierre:      est.texto_cierre,
      estado:            est.estado
    }, est.secciones || []);
  }

  /** Descarga el boletín de un estudiante. No consulta: ya está en memoria. */
  descargar(est: any) {
    if (est.estado === 'sin_generar') {
      Swal.fire('Sin informe', 'Este estudiante todavía no tiene informe generado.', 'info');
      return;
    }

    if (!est.secciones || est.secciones.length === 0) {
      Swal.fire('Sin informe', 'No se encontró el informe del estudiante.', 'info');
      return;
    }

    this.exportarPdfInformeService.generarPDF(this.datosPdfDe(est));
  }

  /**
   * Descarga los boletines de todo el grupo, uno por estudiante.
   *
   * Ya no hay peticiones: los informes están en memoria. Se genera uno a
   * uno con una pausa corta, porque bajar quince PDF de golpe satura el
   * navegador y algunos se pierden.
   */
  async descargarTodos() {
    const conInforme = this.estudiantes.filter(
      e => e.estado !== 'sin_generar' && (e.secciones || []).length > 0);

    if (conInforme.length === 0) {
      Swal.fire('Sin informes', 'Ningún estudiante del grupo tiene informe generado.', 'info');
      return;
    }

    const borradores = conInforme.filter(e => e.estado === 'borrador').length;
    const aviso = borradores > 0
      ? ` ${borradores} están en borrador y saldrán marcados como tal.`
      : '';

    const result = await Swal.fire({
      title: '¿Descargar los boletines?',
      text: `Se generarán ${conInforme.length} archivos PDF, uno por estudiante.${aviso}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d4af37',
      reverseButtons: true
    });

    if (!result.isConfirmed) {
      return;
    }

    this.descargandoTodos = true;
    this.progresoDescarga = 0;

    for (const est of conInforme) {
      this.exportarPdfInformeService.generarPDF(this.datosPdfDe(est));
      this.progresoDescarga++;
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    this.descargandoTodos = false;
    Swal.fire('Listo', `Se generaron ${this.progresoDescarga} boletines.`, 'success');
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}