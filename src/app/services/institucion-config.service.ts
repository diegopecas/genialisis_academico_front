import { Injectable } from '@angular/core';
import { ConfiguracionGlobalService } from './configuracion-global.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class InstitucionConfigService {
  private jardinCodigo: string = '';
  private institucionNombre: string = '';
  private institucionDireccion: string = '';
  private institucionNit: string = '';
  private institucionRazonSocial: string = '';
  private institucionResolucion: string = '';
  private fechaInicioSistema: string = '';
  private anioAcademicoActual: number = new Date().getFullYear();
  private annosEscolares: { id: number; nombre: string }[] = [];
  private configuracionCargada: boolean = false;

  private readonly FONDO_FALLBACK: string = '/assets/images/fondo.png';
  private readonly ULTIMO_TENANT_KEY: string = 'ultimo_tenant';

  constructor(
    private configuracionGlobalService: ConfiguracionGlobalService,
    private router: Router
  ) {}

  async inicializar(): Promise<void> {
    if (this.configuracionCargada) {
      return;
    }

    try {
      let savedInstitucion = sessionStorage.getItem('institucion_actual');
      
      if (savedInstitucion) {
        console.log('🔑 Institución recuperada de sessionStorage:', savedInstitucion);
        this.jardinCodigo = savedInstitucion;
      } else {
        console.log('ℹ️ No hay institución en sessionStorage, esperando login');
        return;
      }

      await this.cargarConfiguracionTenant();

    } catch (error: any) {
      console.error('❌ Error al cargar configuración:', error);
      throw error;
    }
  }

  async cargarConfiguracionTenant(): Promise<void> {
    if (!this.jardinCodigo) {
      throw new Error('No hay tenant configurado');
    }

    try {
      const claves = [
        'institucion_nombre',
        'institucion_direccion',
        'institucion_nit',
        'institucion_razon_social',
        'institucion_resolucion',
        'fecha_inicio_sistema',
        'anio_academico_actual'
      ];
      
      const response = await firstValueFrom(
        this.configuracionGlobalService.obtenerMultiples(claves)
      );

      if (response?.institucion_nombre) {
        this.institucionNombre = response.institucion_nombre.valor_texto || this.institucionNombre;
      }
      if (response?.institucion_direccion) {
        this.institucionDireccion = response.institucion_direccion.valor_texto || '';
      }
      if (response?.institucion_nit) {
        this.institucionNit = response.institucion_nit.valor_texto || '';
      }
      if (response?.institucion_razon_social) {
        this.institucionRazonSocial = response.institucion_razon_social.valor_texto || '';
      }
      if (response?.institucion_resolucion) {
        this.institucionResolucion = response.institucion_resolucion.valor_texto || '';
      }
      if (response?.fecha_inicio_sistema) {
        this.fechaInicioSistema = response.fecha_inicio_sistema.valor_fecha || '';
        this.generarAnnosEscolares();
      }
      if (response?.anio_academico_actual) {
        this.anioAcademicoActual = parseInt(response.anio_academico_actual.valor_texto) || new Date().getFullYear();
      }

      this.configuracionCargada = true;
      console.log('✅ Configuración cargada para:', this.jardinCodigo);

    } catch (error) {
      console.error('Error cargando configuración del tenant:', error);
      throw error;
    }
  }

  private generarAnnosEscolares(): void {
    if (!this.fechaInicioSistema) {
      this.annosEscolares = [];
      return;
    }

    const annoInicio = parseInt(this.fechaInicioSistema.split('-')[0]);
    const annoActual = new Date().getFullYear();

    this.annosEscolares = [];
    for (let anno = annoInicio; anno <= annoActual; anno++) {
      this.annosEscolares.push({
        id: anno,
        nombre: anno.toString()
      });
    }
  }

  setTenantManual(codigo: string, nombre: string): void {
    this.jardinCodigo = codigo;
    this.institucionNombre = nombre;
    sessionStorage.setItem('institucion_actual', codigo);
    localStorage.setItem(this.ULTIMO_TENANT_KEY, codigo);
    this.configuracionCargada = false;
    console.log('✅ Tenant configurado manualmente:', codigo);
  }

  getLogoUrl(): string {
    if (!this.jardinCodigo) {
      console.warn('⚠️ Intento de obtener logo sin institución configurada');
      return '';
    }
    return `/assets/images/instituciones/${this.jardinCodigo}/logo.png`;
  }

  getLogoBasicoUrl(): string {
    if (!this.jardinCodigo) {
      console.warn('⚠️ Intento de obtener logo básico sin institución configurada');
      return '';
    }
    return `/assets/images/instituciones/${this.jardinCodigo}/logo_basico.png`;
  }

  getFondoUrl(): string {
    if (!this.jardinCodigo) {
      console.warn('⚠️ Intento de obtener fondo sin institución configurada');
      return this.FONDO_FALLBACK;
    }
    return `/assets/images/instituciones/${this.jardinCodigo}/fondo.png`;
  }

  getFondoFallbackUrl(): string {
    return this.FONDO_FALLBACK;
  }

  getFondoUrlPorCodigo(codigo: string): string {
    if (!codigo) {
      return this.FONDO_FALLBACK;
    }
    return `/assets/images/instituciones/${codigo}/fondo.png`;
  }

  getUltimoTenantCodigo(): string | null {
    return localStorage.getItem(this.ULTIMO_TENANT_KEY);
  }

  getNombreInstitucion(): string {
    return this.institucionNombre;
  }

  getJardinCodigo(): string {
    return this.jardinCodigo;
  }

  getDireccionInstitucion(): string {
    return this.institucionDireccion;
  }

  getNitInstitucion(): string {
    return this.institucionNit;
  }

  getRazonSocial(): string {
    return this.institucionRazonSocial;
  }

  getResolucion(): string {
    return this.institucionResolucion;
  }

  getAnnosEscolares(): { id: number; nombre: string }[] {
    return this.annosEscolares;
  }

  getAnioAcademicoActual(): number {
    return this.anioAcademicoActual;
  }

  isConfiguracionCargada(): boolean {
    return this.configuracionCargada;
  }

  getTenantHeader(): string {
    if (!this.jardinCodigo) {
      console.error('❌ Intento de obtener tenant header sin institución configurada');
      throw new Error('Institución no configurada');
    }
    return this.jardinCodigo;
  }
}