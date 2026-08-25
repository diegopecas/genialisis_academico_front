import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { PersonasService, PersonaBuscador } from '../../services/personas.service';
import { PermisosService } from '../../services/permisos.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';
import { AccesosRapidosService, AccesoRapido } from '../../services/accesos-rapidos.service';
import { MenuArbolService, MenuNodo } from '../../services/menu-arbol.service';
import { DailyMessageComponent } from '../daily-message/daily-message.component';

/**
 * Un destino al que se puede ir desde una persona encontrada en el buscador.
 * Es lo que llega del backend más la ruta ya resuelta y la etiqueta a mostrar.
 */
interface PersonaDestino {
  tipo: 'estudiante' | 'colaborador' | 'acudiente';
  etiqueta: string;
  detalle: string | null;
  ruta: string;
  activo: boolean;
}

/**
 * Una persona del resultado de búsqueda, con todos sus destinos agrupados.
 * Si tiene un solo destino el clic navega directo; si tiene varios se
 * despliega la lista para que el usuario escoja (el caso del acudiente con
 * varios niños, o del colaborador que además es acudiente).
 */
interface PersonaResultado {
  id_persona: string;
  nombre_completo: string;
  numero_identificacion: string;
  destinos: PersonaDestino[];
  // Etiquetas sin repetir para las insignias del encabezado: quien es
  // acudiente de dos niños no debe mostrar dos veces "Acudiente".
  // Cada etiqueta lleva sus propios destinos, para que al hacerle clic se
  // pueda navegar directo cuando solo hay uno.
  resumen: { etiqueta: string; activo: boolean; destinos: PersonaDestino[] }[];
  // Destinos que se están mostrando en la lista desplegada: todos, o solo los
  // de un rol cuando se llegó por la insignia.
  destinosMostrados: PersonaDestino[];
  // Etiqueta por la que se filtró la lista desplegada (null = sin filtro)
  filtroMostrado: string | null;
}

interface CumpleaneroInfo {
  nombre: string;
  tipo: 'usuario' | 'estudiante' | 'colaborador';
  esMio: boolean;
  id_genero?: number;
  sobrenombre?: string;
  es_docente?: number;
  cargo_corto?: string;
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  standalone: true,
  imports: [CommonModule, RouterModule, DailyMessageComponent],
})
export class MenuComponent implements OnInit {
  public logoBasicoUrl: string = '';
  public nombreInstitucion: string = '';
  public logoGenialisis: string = '/assets/images/logo_app.png';
  public fondoUrl: string = '';

  public nombreUsuario: string = '';

  public currentYear: number = new Date().getFullYear();

  public mostrarBannerCumple: boolean = false;
  public cumpleaneros: CumpleaneroInfo[] = [];
  public mensajeCumple: string = '';
  public confettiPieces: number[] = [];

  public accesosRapidos: AccesoRapido[] = [];

  // Árbol de menú ya filtrado por permisos (fuente para render y búsqueda)
  public arbolMenu: MenuNodo[] = [];
  // Árbol visible en pantalla (igual a arbolMenu, o el subconjunto que coincide con la búsqueda)
  public arbolVisible: MenuNodo[] = [];
  public terminoBusqueda: string = '';
  public enBusqueda: boolean = false;

  // Ids de grupos expandidos manualmente (cuando NO hay búsqueda activa)
  private expandidos: Set<string> = new Set<string>();

  // ---- Búsqueda de personas ----
  // Mínimo de caracteres antes de mostrar personas: con una sola letra se
  // descolgaría medio jardín.
  private readonly MIN_CARACTERES_PERSONAS = 2;
  // Tope de personas en pantalla; si hay más se avisa para que afine la búsqueda.
  private readonly MAX_PERSONAS_VISIBLES = 30;

  public personasVisibles: PersonaResultado[] = [];
  public totalPersonasCoincidencias: number = 0;
  public refrescandoPersonas: boolean = false;

  // Ids de personas con la lista de destinos desplegada
  private personasExpandidas: Set<string> = new Set<string>();

  constructor(
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
    private personasService: PersonasService,
    public permisosService: PermisosService,
    private ayudaModalService: AyudaModalService,
    private accesosRapidosService: AccesosRapidosService,
    private menuArbolService: MenuArbolService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.logoBasicoUrl = this.institucionConfigService.getLogoBasicoUrl();
    this.nombreInstitucion =
      this.institucionConfigService.getNombreInstitucion();
    this.cargarFondoTenant();
    this.cargarNombreUsuario();
    this.verificarCumpleanos();
    this.cargarAccesosRapidos();
    this.cargarArbolMenu();
    // Se pide el buscador de personas por debajo. Si el cache de la sesión
    // sigue vigente no genera petición; si está vencido se refresca solo.
    this.personasService.cargarBuscador();
  }

  private cargarFondoTenant(): void {
    const urlTenant = this.institucionConfigService.getFondoUrl();
    const urlFallback = this.institucionConfigService.getFondoFallbackUrl();

    const img = new Image();
    img.onload = () => {
      this.fondoUrl = urlTenant;
    };
    img.onerror = () => {
      console.warn(`⚠️ Fondo del tenant no encontrado, usando fallback: ${urlFallback}`);
      this.fondoUrl = urlFallback;
    };
    img.src = urlTenant;
  }

  abrirAyuda(): void {
    this.ayudaModalService.abrir();
  }

  irAMiPerfil(): void {
    this.router.navigate(['/mi-perfil']);
  }

  cargarAccesosRapidos(): void {
    if (this.accesosRapidosService.isCacheReady()) {
      this.accesosRapidos = this.accesosRapidosService.getAccesosTop(6);
    } else {
      setTimeout(() => this.cargarAccesosRapidos(), 300);
    }
  }

  irAccesoRapido(acceso: AccesoRapido): void {
    this.router.navigate(['/' + acceso.ruta]);
  }

  toggleFijoAcceso(event: Event, acceso: AccesoRapido): void {
    event.stopPropagation();
    const nuevoEstado = acceso.es_fijo === 1 ? 0 : 1;
    this.accesosRapidosService.toggleFijo(acceso.id, nuevoEstado).subscribe({
      next: () => {
        acceso.es_fijo = nuevoEstado;
        this.accesosRapidos = this.accesosRapidosService.getAccesosTop(6);
      },
      error: () => {
        console.error('Error al fijar/desfijar acceso');
      }
    });
  }

  // ============================================
  // ÁRBOL DE MENÚ + BÚSQUEDA
  // ============================================

  private cargarArbolMenu(): void {
    const arbolCompleto = this.menuArbolService.getArbol();
    this.arbolMenu = this.filtrarPorPermiso(arbolCompleto);
    this.arbolVisible = this.arbolMenu;
  }

  /**
   * Devuelve una copia del árbol conservando solo los nodos visibles según permisos.
   * Reglas: un nodo con `permiso` se conserva si el usuario lo tiene; los nodos sin
   * `permiso` se muestran siempre; un grupo se conserva solo si le queda al menos un hijo visible.
   */
  private filtrarPorPermiso(nodos: MenuNodo[]): MenuNodo[] {
    const resultado: MenuNodo[] = [];

    for (const nodo of nodos) {
      if (nodo.permiso && !this.permisosService.tienePermiso(nodo.permiso)) {
        continue;
      }

      if (nodo.hijos && nodo.hijos.length > 0) {
        const hijosVisibles = this.filtrarPorPermiso(nodo.hijos);
        if (hijosVisibles.length === 0) {
          continue;
        }
        resultado.push({ ...nodo, hijos: hijosVisibles });
      } else {
        resultado.push({ ...nodo });
      }
    }

    return resultado;
  }

  onBuscar(event: Event): void {
    const valor = (event.target as HTMLInputElement).value || '';
    this.terminoBusqueda = valor;
    const termino = valor.trim().toLowerCase();

    if (termino.length === 0) {
      this.enBusqueda = false;
      this.arbolVisible = this.arbolMenu;
      this.limpiarPersonas();
      return;
    }

    this.enBusqueda = true;
    this.arbolVisible = this.filtrarPorTexto(this.arbolMenu, termino);
    this.buscarPersonas(termino);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.enBusqueda = false;
    this.arbolVisible = this.arbolMenu;
    this.limpiarPersonas();
  }

  /**
   * Filtra el árbol dejando los nodos cuyo label coincide con el término y la cadena
   * de ancestros necesaria para llegar a ellos. Si un grupo coincide por sí mismo,
   * se conserva con todos sus hijos.
   */
  private filtrarPorTexto(nodos: MenuNodo[], termino: string): MenuNodo[] {
    const resultado: MenuNodo[] = [];

    for (const nodo of nodos) {
      const coincide = this.coincideTexto(nodo, termino);

      if (nodo.hijos && nodo.hijos.length > 0) {
        if (coincide) {
          resultado.push({ ...nodo });
          continue;
        }
        const hijosCoinciden = this.filtrarPorTexto(nodo.hijos, termino);
        if (hijosCoinciden.length > 0) {
          resultado.push({ ...nodo, hijos: hijosCoinciden });
        }
      } else if (coincide) {
        resultado.push({ ...nodo });
      }
    }

    return resultado;
  }

  /**
   * Quita tildes y pasa a minúsculas para comparar de forma insensible a acentos.
   */
  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Igual que normalizar, pero carácter por carácter, de modo que la cadena resultante
   * conserva la longitud y las posiciones de la original.
   * Se usa en resaltar() para ubicar la coincidencia sobre el label aunque tenga tildes.
   */
  private normalizarPosicional(texto: string): string {
    return Array.from(texto)
      .map((c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || c)
      .join('')
      .toLowerCase();
  }

  /**
   * Un nodo coincide si el término está en su label o en alguno de sus keywords.
   */
  private coincideTexto(nodo: MenuNodo, termino: string): boolean {
    const t = this.normalizar(termino);
    if (this.normalizar(nodo.label).includes(t)) {
      return true;
    }
    if (nodo.keywords) {
      return nodo.keywords.some((k) => this.normalizar(k).includes(t));
    }
    return false;
  }

  esGrupo(nodo: MenuNodo): boolean {
    return !!(nodo.hijos && nodo.hijos.length > 0);
  }

  estaExpandido(nodo: MenuNodo): boolean {
    // Durante la búsqueda todos los grupos del resultado se muestran expandidos
    if (this.enBusqueda) {
      return true;
    }
    return this.expandidos.has(nodo.id);
  }

  toggleNodo(nodo: MenuNodo): void {
    if (this.enBusqueda) {
      return;
    }
    if (this.expandidos.has(nodo.id)) {
      this.expandidos.delete(nodo.id);
    } else {
      this.expandidos.add(nodo.id);
    }
  }

  seleccionarNodo(nodo: MenuNodo): void {
    if (this.esGrupo(nodo)) {
      this.toggleNodo(nodo);
    } else if (nodo.ruta) {
      this.selectOption(nodo.ruta);
    }
  }

  trackByNodo(_index: number, nodo: MenuNodo): string {
    return nodo.id;
  }

  /**
   * Resalta el término buscado dentro del label (envuelve la coincidencia en <mark>).
   * Las etiquetas del menú son estáticas, por eso es seguro renderizar el HTML resultante.
   */
  resaltar(label: string): SafeHtml | string {
    const termino = this.terminoBusqueda.trim();
    if (!this.enBusqueda || termino.length === 0) {
      return label;
    }

    const indice = this.normalizarPosicional(label).indexOf(this.normalizarPosicional(termino));
    if (indice < 0) {
      return label;
    }

    const antes = label.substring(0, indice);
    const match = label.substring(indice, indice + termino.length);
    const despues = label.substring(indice + termino.length);
    return this.sanitizer.bypassSecurityTrustHtml(
      `${antes}<mark class="menu-highlight">${match}</mark>${despues}`
    );
  }

  // ============================================
  // BÚSQUEDA DE PERSONAS
  // ============================================

  private limpiarPersonas(): void {
    this.personasVisibles = [];
    this.totalPersonasCoincidencias = 0;
    this.personasExpandidas.clear();
  }

  /**
   * Busca sobre el cache de personas por nombre o por número de documento y
   * agrupa los resultados por persona, para que quien tenga varios roles
   * (o sea acudiente de varios niños) aparezca una sola vez con su lista.
   */
  private buscarPersonas(termino: string): void {
    if (termino.length < this.MIN_CARACTERES_PERSONAS) {
      this.limpiarPersonas();
      return;
    }

    const filas = this.personasService.getBuscador();
    if (filas.length === 0) {
      this.limpiarPersonas();
      return;
    }

    const t = this.normalizar(termino);
    const agrupadas = new Map<string, PersonaResultado>();

    for (const fila of filas) {
      const permiso = this.permisoDeTipo(fila.tipo);
      if (permiso && !this.permisosService.tienePermiso(permiso)) {
        continue;
      }

      const nombre = this.normalizar(fila.nombre_completo || '');
      const documento = this.normalizar(fila.numero_identificacion || '');
      if (!nombre.includes(t) && !documento.includes(t)) {
        continue;
      }

      let persona = agrupadas.get(fila.id_persona);
      if (!persona) {
        persona = {
          id_persona: fila.id_persona,
          nombre_completo: fila.nombre_completo,
          numero_identificacion: fila.numero_identificacion,
          destinos: [],
          resumen: [],
          destinosMostrados: [],
          filtroMostrado: null,
        };
        agrupadas.set(fila.id_persona, persona);
      }

      persona.destinos.push({
        tipo: fila.tipo,
        etiqueta: this.etiquetaDeTipo(fila.tipo),
        detalle: fila.detalle,
        ruta: this.rutaDeDestino(fila),
        activo: fila.activo === 1,
      });
    }

    const resultados = Array.from(agrupadas.values());

    // Dentro de cada persona: primero lo activo, luego por tipo.
    for (const persona of resultados) {
      persona.destinos.sort((a, b) => {
        if (a.activo !== b.activo) {
          return a.activo ? -1 : 1;
        }
        return this.ordenDeTipo(a.tipo) - this.ordenDeTipo(b.tipo);
      });

      // El resumen se arma aquí y no en el template, porque una función en el
      // HTML se reevalúa en cada ciclo de detección de cambios.
      const vistas = new Map<string, PersonaDestino[]>();
      for (const destino of persona.destinos) {
        const previos = vistas.get(destino.etiqueta) || [];
        previos.push(destino);
        vistas.set(destino.etiqueta, previos);
      }
      persona.resumen = Array.from(vistas.entries()).map(
        ([etiqueta, destinos]) => ({
          etiqueta,
          activo: destinos.some((d) => d.activo),
          destinos,
        })
      );

      persona.destinosMostrados = persona.destinos;
      persona.filtroMostrado = null;
    }

    resultados.sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo, 'es')
    );

    this.totalPersonasCoincidencias = resultados.length;
    this.personasVisibles = resultados.slice(0, this.MAX_PERSONAS_VISIBLES);
    this.personasExpandidas.clear();
  }

  /**
   * Permiso que gobierna cada tipo de destino. Si el usuario no lo tiene,
   * ese destino no se lista; si a la persona no le queda ninguno, no aparece.
   */
  private permisoDeTipo(tipo: string): string | null {
    switch (tipo) {
      case 'estudiante':
        return 'estudiantes.listado';
      case 'colaborador':
        return 'colaboradores.listado';
      case 'acudiente':
        return 'estudiantes.acudientes';
      default:
        return null;
    }
  }

  private etiquetaDeTipo(tipo: string): string {
    switch (tipo) {
      case 'estudiante':
        return 'Estudiante';
      case 'colaborador':
        return 'Colaborador';
      case 'acudiente':
        return 'Acudiente';
      default:
        return tipo;
    }
  }

  private ordenDeTipo(tipo: string): number {
    switch (tipo) {
      case 'estudiante':
        return 0;
      case 'colaborador':
        return 1;
      case 'acudiente':
        return 2;
      default:
        return 3;
    }
  }

  /**
   * Ruta destino según el tipo.
   *
   * El acudiente va derecho a su pantalla de edición, que necesita el id del
   * acudiente y el del estudiante. Esa ruta está protegida con
   * `estudiantes.acudientes.administrar`; quien no lo tenga se queda en el
   * listado de acudientes del estudiante, que sí puede ver.
   */
  private rutaDeDestino(fila: PersonaBuscador): string {
    switch (fila.tipo) {
      case 'estudiante':
        return '/estudiantes/opciones/' + fila.id_destino;
      case 'colaborador':
        return '/colaboradores/opciones/' + fila.id_destino;
      case 'acudiente':
        if (
          fila.id_secundario &&
          this.permisosService.tienePermiso('estudiantes.acudientes.administrar')
        ) {
          return (
            '/estudiantes/acudientes/editar/' +
            fila.id_destino +
            '/' +
            fila.id_secundario
          );
        }
        return '/estudiantes/acudientes/' + (fila.id_secundario || '');
      default:
        return '';
    }
  }

  esPersonaExpandida(persona: PersonaResultado): boolean {
    return this.personasExpandidas.has(persona.id_persona);
  }

  /**
   * Un solo destino: navega directo. Varios: despliega la lista completa.
   */
  seleccionarPersona(persona: PersonaResultado): void {
    if (persona.destinos.length === 1) {
      this.irADestino(persona.destinos[0]);
      return;
    }

    const yaAbierta =
      this.personasExpandidas.has(persona.id_persona) &&
      persona.filtroMostrado === null;

    if (yaAbierta) {
      this.personasExpandidas.delete(persona.id_persona);
      return;
    }

    persona.destinosMostrados = persona.destinos;
    persona.filtroMostrado = null;
    this.personasExpandidas.add(persona.id_persona);
  }

  /**
   * Clic en la insignia de rol: se ahorra un paso y va derecho a la opción.
   * Solo cuando ese rol tiene varios destinos (una acudiente con dos niños)
   * no hay a dónde ir sin preguntar, y ahí se despliega la lista mostrando
   * únicamente los destinos de ese rol.
   */
  clicEnEtiqueta(
    event: Event,
    persona: PersonaResultado,
    etiqueta: { etiqueta: string; activo: boolean; destinos: PersonaDestino[] }
  ): void {
    event.stopPropagation();

    if (etiqueta.destinos.length === 1) {
      this.irADestino(etiqueta.destinos[0]);
      return;
    }

    const yaAbierta =
      this.personasExpandidas.has(persona.id_persona) &&
      persona.filtroMostrado === etiqueta.etiqueta;

    if (yaAbierta) {
      this.personasExpandidas.delete(persona.id_persona);
      return;
    }

    persona.destinosMostrados = etiqueta.destinos;
    persona.filtroMostrado = etiqueta.etiqueta;
    this.personasExpandidas.add(persona.id_persona);
  }

  irADestino(destino: PersonaDestino): void {
    if (destino.ruta) {
      this.router.navigate([destino.ruta]);
    }
  }

  trackByPersona(_index: number, persona: PersonaResultado): string {
    return persona.id_persona;
  }

  /**
   * Botón de refrescar del buscador: vuelve a traer la lista de personas.
   * Al terminar se repite la búsqueda para que lo que está en pantalla
   * refleje los datos recién traídos.
   */
  refrescarPersonas(event: Event): void {
    event.stopPropagation();
    if (this.refrescandoPersonas) {
      return;
    }

    this.refrescandoPersonas = true;
    this.personasService.refrescarBuscador().subscribe({
      next: () => {
        this.refrescandoPersonas = false;
        const termino = this.terminoBusqueda.trim().toLowerCase();
        if (termino.length > 0) {
          this.buscarPersonas(termino);
        }
      },
      error: () => {
        this.refrescandoPersonas = false;
      },
    });
  }

  /**
   * Texto del tooltip del botón de refrescar, con la hora del último cargue.
   */
  get tituloRefrescoPersonas(): string {
    const fecha = this.personasService.getFechaCargaBuscador();
    if (!fecha) {
      return 'Actualizar la lista de personas';
    }
    const hora = fecha.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return 'Personas actualizadas a las ' + hora + '. Clic para actualizar.';
  }

  private cargarNombreUsuario(): void {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        this.nombreUsuario = usuario.primer_nombre || '';
      }
    } catch (error) {
      console.error('Error al cargar nombre de usuario:', error);
      this.nombreUsuario = '';
    }
  }

  private verificarCumpleanos(): void {
    let usuario: any = null;
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        usuario = JSON.parse(usuarioStr);
      }
    } catch (error) {
      console.error('Error al parsear usuario:', error);
    }

    if (!usuario) return;

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;
    const fechaHoyStr = `${hoy.getFullYear()}-${mesHoy}-${diaHoy}`;

    if (usuario.fecha_nacimiento) {
      const fechaUsuario = new Date(usuario.fecha_nacimiento + 'T00:00:00');
      if (
        fechaUsuario.getDate() === diaHoy &&
        fechaUsuario.getMonth() + 1 === mesHoy
      ) {
        this.cumpleaneros.push({
          nombre: usuario.primer_nombre,
          tipo: 'usuario',
          esMio: true,
        });
      }
    }

    try {
      const cacheStr = sessionStorage.getItem('cumpleanos_cache');
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        if (cache.fecha === fechaHoyStr) {
          this.procesarCumpleanerosComunidad(cache.data);
          return;
        }
      }
    } catch (error) {
      console.error('Error al leer cache de cumpleaños:', error);
    }

    this.personasService.obtenerCumpleanosHoy().subscribe(
      (response: any) => {
        const cumpleanerosHoy = (response.body as any[]) || [];

        sessionStorage.setItem(
          'cumpleanos_cache',
          JSON.stringify({
            fecha: fechaHoyStr,
            data: cumpleanerosHoy,
          }),
        );

        this.procesarCumpleanerosComunidad(cumpleanerosHoy);
      },
      (error) => {
        console.error('Error al obtener cumpleañeros del día:', error);
        this.construirMensajeCumple();
      },
    );
  }

  private procesarCumpleanerosComunidad(cumpleanerosHoy: any[]): void {
    if (cumpleanerosHoy && cumpleanerosHoy.length > 0) {
      cumpleanerosHoy.forEach((c: any) => {
        const yaExiste = this.cumpleaneros.some(
          (existing) => existing.nombre === c.primer_nombre && existing.esMio,
        );
        if (!yaExiste) {
          this.cumpleaneros.push({
            nombre: c.primer_nombre,
            tipo: c.tipo,
            esMio: false,
            id_genero: c.id_genero ? parseInt(c.id_genero) : undefined,
            sobrenombre: c.sobrenombre || undefined,
            es_docente: c.es_docente ? parseInt(c.es_docente) : 0,
            cargo_corto: c.cargo_corto || undefined,
          });
        }
      });
    }
    this.construirMensajeCumple();
  }

  private construirMensajeCumple(): void {
    if (this.cumpleaneros.length === 0) return;

    this.mostrarBannerCumple = true;
    this.generarConfetti();

    const usuarioCumple = this.cumpleaneros.filter((c) => c.tipo === 'usuario');
    const estudiantesCumple = this.cumpleaneros.filter(
      (c) => c.tipo === 'estudiante',
    );
    const colaboradoresCumple = this.cumpleaneros.filter(
      (c) => c.tipo === 'colaborador',
    );

    const partes: string[] = [];

    if (usuarioCumple.length > 0) {
      partes.push(
        `¡Feliz cumpleaños, ${usuarioCumple[0].nombre}! 🎉 Esperamos que tengas un día maravilloso.`,
      );
    }

    if (estudiantesCumple.length === 1) {
      const prefijo =
        usuarioCumple.length > 0 ? 'Hoy también celebramos' : 'Hoy celebramos';
      partes.push(
        `${prefijo} el cumpleaños de ${estudiantesCumple[0].nombre}. 🎂`,
      );
    } else if (estudiantesCumple.length > 1) {
      const prefijo =
        usuarioCumple.length > 0 ? 'Hoy también celebramos' : 'Hoy celebramos';
      const nombres = this.formatearNombres(
        estudiantesCumple.map((e) => e.nombre),
      );
      partes.push(`${prefijo} el cumpleaños de ${nombres}. 🎂`);
    }

    if (colaboradoresCumple.length > 0) {
      const mensajesColab = colaboradoresCumple.map((c) =>
        this.construirMensajeColaborador(c),
      );
      const prefijo = partes.length > 0 ? 'Y f' : '¡F';
      if (colaboradoresCumple.length === 1) {
        partes.push(`${prefijo}eliz cumpleaños a ${mensajesColab[0]}! 🌟`);
      } else {
        partes.push(
          `${prefijo}eliz cumpleaños a ${this.formatearNombres(mensajesColab)}! 🌟`,
        );
      }
    }

    this.mensajeCumple = partes.join(' ');
  }

  private construirMensajeColaborador(c: CumpleaneroInfo): string {
    const esFemenino = c.id_genero === 1;
    const articulo = esFemenino ? 'nuestra' : 'nuestro';
    const nombreMostrar = c.sobrenombre || c.nombre;

    if (c.es_docente === 1 && c.cargo_corto) {
      return `${articulo} ${c.cargo_corto} ${nombreMostrar}`;
    }

    const titulo = esFemenino ? 'colaboradora' : 'colaborador';
    return `${articulo} ${titulo} ${nombreMostrar}`;
  }

  private formatearNombres(nombres: string[]): string {
    if (nombres.length === 1) return nombres[0];
    if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
    const copia = [...nombres];
    const ultimoNombre = copia.pop();
    return `${copia.join(', ')} y ${ultimoNombre}`;
  }

  private generarConfetti(): void {
    this.confettiPieces = Array.from({ length: 50 }, (_, i) => i);
  }

  cerrarBannerCumple(): void {
    this.mostrarBannerCumple = false;
  }

  selectOption(path: string): void {
    this.router.navigate([path]);
  }

  salir(): void {
    Swal.fire({
      title: '¿Desea salir del sistema?',
      text: 'Tu sesión será cerrada',
      icon: 'question',
      iconColor: '#FFC107',
      showCancelButton: true,
      confirmButtonText: 'Salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FFC107',
      cancelButtonColor: '#E0E0E0',
      reverseButtons: true,
      customClass: {
        popup: 'swal-custom-popup',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
      showClass: {
        popup: 'animate__animated animate__fadeIn animate__faster',
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.accesosRapidosService.sincronizar();
        this.personasService.limpiarCacheBuscador();
        sessionStorage.removeItem('usuario');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('institucion_actual');
        sessionStorage.removeItem('cumpleanos_cache');
        this.router.navigate(['/login']);
      }
    });
  }
}