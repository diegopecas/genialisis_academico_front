import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { httpOptions } from '../../services/http';

@Injectable({
  providedIn: 'root'
})
export class ConstantesService {

  private urls = {
    tiposEventoCalendario: environment.api + 'tipos-evento-calendario', // ok
    cargos: environment.api + 'cargos', // ok
    grados: environment.api + 'grados', // ok
    generos: environment.api + 'generos', // ok
    tiposIdentificacion: environment.api + 'tipos-identificacion', // ok
    tiposDias: environment.api + 'tipos-dias', // ok
    diasSemana: environment.api + 'dias-semana', // ok
    grupos: environment.api + 'grupos', // ok
    areasAcademicas: environment.api + 'areas-academicas', // ok
    competenciasCognitivas: environment.api + 'competencias-cognitivas', // ok
    cortesAcademicos: environment.api + 'cortes-academicos', // ok
    ejesCurriculares: environment.api + 'ejes-curriculares', // ok
    esferasDesarrollo: environment.api + 'esferas-desarrollo', // ok
    estandaresBasicos: environment.api + 'estandares-basicos', // ok
    tiposActividadesAcademicas: environment.api + 'tipos-actividades-academicas', // ok
    nivelesEscolaridad: environment.api + 'niveles-escolaridad', // ok
    paises: environment.api + 'paises', // ok
    departamentos: environment.api + 'departamentos', // ok
    ciudades: environment.api + 'ciudades', // ok
    estadosTareas: environment.api + 'estados-tareas', // ok
    casasDocentes: environment.api + 'casas-docentes', // ok
    tiposPuntos: environment.api + 'tipos-puntos', // ok
  } as any;

  private constantes = [
    "tiposEventoCalendario",
    "cargos",
    "grados",
    "generos",
    "tiposIdentificacion",
    "tiposDias",
    "diasSemana",
    "grupos",
    "areasAcademicas",
    "competenciasCognitivas",
    "cortesAcademicos",
    "ejesCurriculares",
    "esferasDesarrollo",
    "estandaresBasicos",
    "tiposActividadesAcademicas",
    "nivelesEscolaridad",
    "paises",
    "departamentos",
    "ciudades",
    "estadosTareas",
    "casasDocentes",
    "tiposPuntos"
  ]

  public listas = {
    tiposEventoCalendario: [],
    cargos: [],
    grados: [],
    generos: [],
    tiposIdentificacion: [],
    tiposDias: [],
    diasSemana: [],
    grupos: [],
    areasAcademicas: [],
    competenciasCognitivas: [],
    cortesAcademicos: [],
    ejesCurriculares: [],
    esferasDesarrollo: [],
    estandaresBasicos: [],
    tiposActividadesAcademicas: [],
    nivelesEscolaridad: [],
    paises: [],
    departamentos: [],
    ciudades: [],
    estadosTareas: [],
    casasDocentes: [],
    tiposPuntos: []
  } as any;

  constructor(private http: HttpClient) {}

  obtenerTodos(servicio:any) {
    return this.http
      .get<HttpResponse<Object>>(this.urls[servicio], { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }

  cargarListas() {
    this.constantes.forEach((c:any) => {
      this.obtenerTodos(c).subscribe((response:any)=>{
        this.listas[c] = response.body;
        // console.log("cargar "+c,this.listas[c]);
      });
    })
  }

  obtenerLista(lista:any): Observable<any[]> {
    if (this.listas[lista].length > 0) {
      // Si la lista ya tiene datos, devolverla de forma sincrónica
      return of(this.listas[lista]);
    } else {
      // Si la lista está vacía, llamar al servicio para obtener los datos
      return this.http.get<any[]>('URL_DEL_SERVICIO').pipe(
        map((response:any) => {
          // Guardar los datos en la lista
          this.listas[lista] = response;
          return this.listas[lista];
        }),
        catchError((error) => {
          console.error('Error al obtener los datos:', error);
          return of([]); // Devolver una lista vacía en caso de error
        })
      );
    }
  }

}
