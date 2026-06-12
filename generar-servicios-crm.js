const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURACIÓN
// =====================================================

// Carpeta donde se generarán los servicios
const CARPETA_DESTINO = 'app/services/'; // Cambia esta ruta según necesites

// =====================================================
// LISTA DE SERVICIOS A GENERAR
// =====================================================

const servicios = [
  // CATÁLOGOS - TAB 1
  { nombre: 'TiposContacto', ruta: 'tipos-contacto', tipo: 'catalogo' },
  { nombre: 'TiposComoConocio', ruta: 'tipos-como-conocio', tipo: 'catalogo' },
  { nombre: 'TiposParentesco', ruta: 'tipos-parentesco', tipo: 'catalogo' },
  { nombre: 'TiposRazonesBusqueda', ruta: 'tipos-razones-busqueda', tipo: 'catalogo' },
  { nombre: 'ParametrosDisc', ruta: 'parametros-disc', tipo: 'catalogo', metodosEspeciales: ['obtenerPorCategoria'] },
  { nombre: 'TiposNivelInteres', ruta: 'tipos-nivel-interes', tipo: 'catalogo' },
  { nombre: 'TiposUrgencia', ruta: 'tipos-urgencia', tipo: 'catalogo' },
  { nombre: 'TiposCuandoSeguimiento', ruta: 'tipos-cuando-seguimiento', tipo: 'catalogo' },
  { nombre: 'TiposQuienDecide', ruta: 'tipos-quien-decide', tipo: 'catalogo' },
  { nombre: 'TiposCompromisos', ruta: 'tipos-compromisos', tipo: 'catalogo' },
  
  // PROTOCOLO
  { nombre: 'ProtocoloPasos', ruta: 'protocolo-pasos', tipo: 'catalogo' },
  { nombre: 'ProtocoloContenidoPerfil', ruta: 'protocolo-contenido-perfil', tipo: 'catalogo', metodosEspeciales: ['obtenerPorPaso', 'obtenerPorPasoYPerfil'] },
  
  // OBJECIONES Y RESULTADOS
  { nombre: 'TiposObjeciones', ruta: 'tipos-objeciones', tipo: 'catalogo' },
  { nombre: 'TiposResultadoVisita', ruta: 'tipos-resultado-visita', tipo: 'catalogo' },
  
  // SERVICIOS Y ASPECTOS
  { nombre: 'ServiciosJardin', ruta: 'servicios-jardin', tipo: 'catalogo' },
  { nombre: 'TiposImportanciaDetalle', ruta: 'tipos-importancia-detalle', tipo: 'catalogo' },
  { nombre: 'TiposNivelAgradecimiento', ruta: 'tipos-nivel-agradecimiento', tipo: 'catalogo' },
  { nombre: 'ServiciosFaltantes', ruta: 'servicios-faltantes', tipo: 'catalogo' },
  { nombre: 'TiposImportanciaServicioFaltante', ruta: 'tipos-importancia-servicio-faltante', tipo: 'catalogo' },
  { nombre: 'AspectosMejorar', ruta: 'aspectos-mejorar', tipo: 'catalogo' },
  { nombre: 'TiposValidezFeedback', ruta: 'tipos-validez-feedback', tipo: 'catalogo' },
  
  // PERFIL Y CLASIFICACIÓN
  { nombre: 'TiposPerfilEconomico', ruta: 'tipos-perfil-economico', tipo: 'catalogo' },
  { nombre: 'TiposNivelExigencia', ruta: 'tipos-nivel-exigencia', tipo: 'catalogo' },
  { nombre: 'TiposSemaforoCliente', ruta: 'tipos-semaforo-cliente', tipo: 'catalogo' },
  { nombre: 'TiposInclinacionDecision', ruta: 'tipos-inclinacion-decision', tipo: 'catalogo' },
  
  // ============================================
  // SERVICIOS PRINCIPALES - TAB 1
  // ============================================
  { 
    nombre: 'Visitas', 
    ruta: 'visitas', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorFecha', 'obtenerVisitaCompleta']
  },
  { 
    nombre: 'Visitantes', 
    ruta: 'visitantes', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'actualizarPerfilDisc']
  },
  { 
    nombre: 'VisitasNinos', 
    ruta: 'visitas-ninos', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita']
  },
  { 
    nombre: 'VisitasRazonesBusqueda', 
    ruta: 'visitas-razones-busqueda', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples']
  },
  { 
    nombre: 'VisitasObservacionesDisc', 
    ruta: 'visitas-observaciones-disc', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisitante', 'guardarMultiples']
  },
  { 
    nombre: 'VisitasPerfilCalculado', 
    ruta: 'visitas-perfil-calculado', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisitante', 'calcularPerfil']
  },
  { 
    nombre: 'VisitasTemperatura', 
    ruta: 'visitas-temperatura', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarTemperatura']
  },
  { 
    nombre: 'VisitasSeguimiento', 
    ruta: 'visitas-seguimiento', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarSeguimiento', 'obtenerPendientesSeguimiento']
  },
  { 
    nombre: 'VisitasCompromisos', 
    ruta: 'visitas-compromisos', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples', 'obtenerProximos', 'obtenerVencidos']
  },
  
  // ============================================
  // TAB 2: PROTOCOLO
  // ============================================
  { 
    nombre: 'VisitasProtocoloPasosCompletados', 
    ruta: 'visitas-protocolo-pasos-completados', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'marcarCompletado', 'obtenerProgreso']
  },
  { 
    nombre: 'VisitasProtocoloChecklist', 
    ruta: 'visitas-protocolo-checklist', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'obtenerPorVisitaYPaso', 'guardarMultiples', 'toggleItem']
  },
  
  // ============================================
  // TAB 3: OBJECIONES
  // ============================================
  { 
    nombre: 'VisitasObjeciones', 
    ruta: 'visitas-objeciones', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples', 'obtenerEstadisticas']
  },
  
  // ============================================
  // TAB 4: CIERRE Y APRENDIZAJES
  // ============================================
  { 
    nombre: 'VisitasResultado', 
    ruta: 'visitas-resultado', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarResultado', 'obtenerEstadisticas']
  },
  { 
    nombre: 'VisitasServiciosGustaron', 
    ruta: 'visitas-servicios-gustaron', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples', 'obtenerMasValorados']
  },
  { 
    nombre: 'VisitasAspectosPositivos', 
    ruta: 'visitas-aspectos-positivos', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardar']
  },
  { 
    nombre: 'VisitasDetalleObsequio', 
    ruta: 'visitas-detalle-obsequio', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardar']
  },
  { 
    nombre: 'VisitasServiciosNoTenemos', 
    ruta: 'visitas-servicios-no-tenemos', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples', 'obtenerMasSolicitados']
  },
  { 
    nombre: 'VisitasFeedbackMejorar', 
    ruta: 'visitas-feedback-mejorar', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardarMultiples', 'obtenerMasMencionados']
  },
  { 
    nombre: 'VisitasPerfilProspecto', 
    ruta: 'visitas-perfil-prospecto', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardar']
  },
  { 
    nombre: 'VisitasCompetencia', 
    ruta: 'visitas-competencia', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardar', 'obtenerMasMencionados']
  },
  { 
    nombre: 'VisitasAprendizajes', 
    ruta: 'visitas-aprendizajes', 
    tipo: 'principal',
    metodosEspeciales: ['obtenerPorVisita', 'guardar', 'obtenerRecientes']
  }
];

// =====================================================
// FUNCIONES GENERADORAS
// =====================================================

function generarMetodosEspeciales(metodosEspeciales = []) {
  let codigo = '';
  
  metodosEspeciales.forEach(metodo => {
    switch(metodo) {
      case 'obtenerPorCategoria':
        codigo += `
  obtenerPorCategoria(categoria: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/categoria/' + categoria, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorVisita':
        codigo += `
  obtenerPorVisita(idVisita: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/visita/' + idVisita, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorVisitante':
        codigo += `
  obtenerPorVisitante(idVisitante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/visitante/' + idVisitante, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorFecha':
        codigo += `
  obtenerPorFecha(fechaInicio: string, fechaFin: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/fecha/' + fechaInicio + '/' + fechaFin, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerVisitaCompleta':
        codigo += `
  obtenerVisitaCompleta(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/completa/' + id, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'actualizarPerfilDisc':
        codigo += `
  actualizarPerfilDisc(data: any) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/perfil-disc', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'guardarMultiples':
        codigo += `
  guardarMultiples(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/multiples', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'calcularPerfil':
        codigo += `
  calcularPerfil(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/calcular', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'guardarTemperatura':
      case 'guardarSeguimiento':
      case 'guardarResultado':
      case 'guardar':
        codigo += `
  guardar(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/guardar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'obtenerPendientesSeguimiento':
        codigo += `
  obtenerPendientesSeguimiento() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/pendientes', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerProximos':
        codigo += `
  obtenerProximos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/proximos', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerVencidos':
        codigo += `
  obtenerVencidos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/vencidos', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'marcarCompletado':
        codigo += `
  marcarCompletado(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/marcar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'obtenerProgreso':
        codigo += `
  obtenerProgreso(idVisita: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/progreso/' + idVisita, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorVisitaYPaso':
        codigo += `
  obtenerPorVisitaYPaso(idVisita: any, idProtocoloPaso: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/visita/' + idVisita + '/paso/' + idProtocoloPaso, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'toggleItem':
        codigo += `
  toggleItem(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/toggle', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
`;
        break;
        
      case 'obtenerEstadisticas':
        codigo += `
  obtenerEstadisticas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/estadisticas', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerMasValorados':
        codigo += `
  obtenerMasValorados() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/mas-valorados', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerMasSolicitados':
        codigo += `
  obtenerMasSolicitados() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/mas-solicitados', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerMasMencionados':
        codigo += `
  obtenerMasMencionados() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/mas-mencionados', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerRecientes':
        codigo += `
  obtenerRecientes(limite: number = 10) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/recientes/' + limite, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorPaso':
        codigo += `
  obtenerPorPaso(idPaso: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/paso/' + idPaso, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
        
      case 'obtenerPorPasoYPerfil':
        codigo += `
  obtenerPorPasoYPerfil(idPaso: any, perfil: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/paso/' + idPaso + '/perfil/' + perfil, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
`;
        break;
    }
  });
  
  return codigo;
}

function generarServicio(config) {
  const { nombre, ruta, metodosEspeciales = [] } = config;
  
  // Generar código de métodos especiales
  const codigoMetodosEspeciales = generarMetodosEspeciales(metodosEspeciales);
  
  return `import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class ${nombre}Service {

  private servicio = environment.api + '${ruta}';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/' + id, { observe: 'response' })
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

  crear(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(data: any) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.delete<any>(this.servicio, {
      ...httpOptions,
      body: body
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
${codigoMetodosEspeciales}
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
`;
}

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

function generarArchivos() {
  console.log('🚀 Iniciando generación de servicios CRM Angular...\n');
  
  // Crear carpeta si no existe
  if (!fs.existsSync(CARPETA_DESTINO)) {
    fs.mkdirSync(CARPETA_DESTINO, { recursive: true });
    console.log(`📁 Carpeta creada: ${CARPETA_DESTINO}\n`);
  }
  
  let contador = 0;
  
  // Generar cada servicio
  servicios.forEach(servicio => {
    const contenido = generarServicio(servicio);
    const nombreArchivo = `${servicio.ruta}.service.ts`;
    const rutaCompleta = path.join(CARPETA_DESTINO, nombreArchivo);
    
    fs.writeFileSync(rutaCompleta, contenido, 'utf8');
    contador++;
    console.log(`✅ [${contador}/${servicios.length}] ${nombreArchivo}`);
  });
  
  console.log(`\n🎉 ¡Completado! Se generaron ${contador} servicios exitosamente.`);
  console.log(`📂 Ubicación: ${path.resolve(CARPETA_DESTINO)}`);
}

// =====================================================
// EJECUTAR
// =====================================================

try {
  generarArchivos();
} catch (error) {
  console.error('❌ Error al generar archivos:', error);
  process.exit(1);
}