import {Pipe, PipeTransform} from '@angular/core';

/**
 * Quita las tildes y pasa a minúsculas, para que buscar "maria" encuentre
 * "María" y buscar "MARÍA" encuentre "maria". Se usa tanto para el texto
 * que escribe el usuario como para el contenido de cada registro.
 */
export function normalizarTexto(texto: any): string {
  if (texto === null || texto === undefined) return '';
  return texto.toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Pipe({ name: 'SearchPipeGeneral',standalone: true })
export class SearchPipeGeneral implements PipeTransform {
  transform(value: any, args?: any): any {

      if (!value) {
        return null;
      }

      if (!args) {
        return value;
      }

      args = normalizarTexto(args);

      return value.filter((item:any) => {
          return normalizarTexto(JSON.stringify(item)).includes(args);
      });
  }
}
