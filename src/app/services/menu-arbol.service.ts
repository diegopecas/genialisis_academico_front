import { Injectable, inject } from '@angular/core';
import { GrupoMenuModulo, MenuModulosService, ModuloMenu, OpcionMenuModulo } from './menu-modulos.service';

/**
 * Nodo del árbol de menú.
 * - Si tiene `ruta` es una hoja navegable.
 * - Si tiene `hijos` es un grupo expandible.
 * - `permiso` (opcional) gatea la visibilidad; los nodos sin permiso se muestran siempre.
 * - `keywords` (opcional) son términos alternativos para que la búsqueda encuentre el nodo
 *   aunque el usuario escriba una palabra distinta al label.
 */
export interface MenuNodo {
  id: string;
  label: string;
  icono: string;
  imagen?: string;
  ruta?: string;
  permiso?: string;
  keywords?: string[];
  hijos?: MenuNodo[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuArbolService {

  private menuModulosService = inject(MenuModulosService);

  /**
   * Devuelve el árbol completo del menú.
   * Ya no declara datos: los arma desde el catálogo de menu-modulos.service.ts,
   * que es el mismo que pintan las tarjetas de cada módulo. Así el árbol y las
   * pantallas no se pueden desincronizar.
   */
  getArbol(): MenuNodo[] {
    return this.menuModulosService.getModulos()
      .filter((modulo) => modulo.raiz !== false)
      .map((modulo) => this.nodoModulo(modulo));
  }

  /**
   * Un módulo se vuelve un nodo raíz. Debajo van, en este orden:
   * el acceso a su propia pantalla, sus tarjetas, sus opciones sueltas y
   * los módulos que cuelgan de él. Si no tiene nada debajo, queda como hoja.
   */
  private nodoModulo(modulo: ModuloMenu): MenuNodo {
    const hijos: MenuNodo[] = [];

    const tieneContenido =
      modulo.grupos.length > 0 ||
      (modulo.opciones?.length ?? 0) > 0 ||
      (modulo.submodulos?.length ?? 0) > 0;

    const esRaiz = modulo.raiz !== false;

    // En las raíces la pantalla del módulo queda como primer hijo, porque la
    // cabecera de la tarjeta es la que abre y cierra la sección. En los módulos
    // anidados la ruta va en el nodo mismo y se entra haciendo clic en su nombre.
    if (modulo.ruta && tieneContenido && esRaiz) {
      hijos.push({
        id: `${modulo.id}-inicio`,
        label: modulo.rutaLabel || modulo.label,
        icono: modulo.iconoArbol,
        ruta: modulo.ruta,
        permiso: modulo.rutaPermiso || modulo.permiso
      });
    }

    // Los submódulos van antes que las tarjetas, que es el orden en el que
    // aparecen en la pantalla del módulo.
    for (const idSubmodulo of modulo.submodulos ?? []) {
      const submodulo = this.menuModulosService.getModulo(idSubmodulo);
      if (submodulo) {
        hijos.push(this.nodoModulo(submodulo));
      }
    }

    for (const grupo of modulo.grupos) {
      const nodo = this.nodoGrupo(grupo, modulo.id);
      if (nodo) {
        hijos.push(nodo);
      }
    }

    for (const opcion of modulo.opciones ?? []) {
      hijos.push(this.nodoOpcion(opcion, modulo.id));
    }

    if (hijos.length === 0) {
      return {
        id: modulo.id,
        label: modulo.label,
        icono: modulo.iconoArbol,
        imagen: modulo.imagen,
        ruta: modulo.ruta,
        permiso: modulo.permiso,
        keywords: modulo.keywords
      };
    }

    return {
      id: modulo.id,
      label: modulo.label,
      icono: modulo.iconoArbol,
      // La imagen es solo para las tarjetas raíz; los módulos anidados van con su emoji
      imagen: esRaiz ? modulo.imagen : undefined,
      ruta: esRaiz ? undefined : modulo.ruta,
      permiso: esRaiz ? modulo.permiso : (modulo.rutaPermiso || modulo.permiso),
      keywords: modulo.keywords,
      hijos
    };
  }

  /**
   * Una tarjeta se vuelve un grupo del árbol con sus mismas opciones.
   * La descripción de la tarjeta entra como keyword para que también se pueda buscar por ahí.
   * Si la tarjeta no tiene opciones no se genera nodo, para no dejar grupos vacíos.
   */
  private nodoGrupo(grupo: GrupoMenuModulo, prefijo: string): MenuNodo | null {
    if (grupo.opciones.length === 0) {
      return null;
    }

    const id = `${prefijo}-${grupo.id}`;

    return {
      id,
      label: grupo.titulo,
      icono: grupo.iconoArbol || '📁',
      keywords: [...(grupo.keywords ?? []), grupo.descripcion],
      hijos: grupo.opciones.map((opcion) => this.nodoOpcion(opcion, id))
    };
  }

  /**
   * Una opción se vuelve hoja navegable. Si abre otra pantalla con más opciones,
   * conserva su ruta y suma esas pantallas como hijos: el clic en el nombre entra
   * a la opción y la flechita despliega lo que hay debajo.
   */
  private nodoOpcion(opcion: OpcionMenuModulo, prefijo: string): MenuNodo {
    const id = `${prefijo}-${opcion.id}`;
    const icono = opcion.iconoArbol || '▫️';
    const keywords = this.keywordsOpcion(opcion);

    const nodo: MenuNodo = {
      id,
      label: opcion.label,
      icono,
      ruta: opcion.ruta,
      permiso: opcion.permiso,
      keywords
    };

    if (opcion.hijos && opcion.hijos.length > 0) {
      nodo.hijos = opcion.hijos.map((hijo) => this.nodoOpcion(hijo, id));
    }

    return nodo;
  }

  /**
   * El `alt` de la tarjeta sirve como término de búsqueda cuando dice algo distinto
   * al label (por ejemplo la opción "Informes", cuyo alt es "Observaciones para Informe").
   */
  private keywordsOpcion(opcion: OpcionMenuModulo): string[] {
    const keywords = [...(opcion.keywords ?? [])];
    if (opcion.alt && opcion.alt !== opcion.label) {
      keywords.push(opcion.alt);
    }
    return keywords;
  }
}