import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { ConfiguracionGlobalService } from '../../../services/configuracion-global.service';
import Swal from 'sweetalert2';
import * as L from 'leaflet';

@Component({
  selector: 'app-configuracion-geofence',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule],
  templateUrl: './configuracion-geofence.component.html',
  styleUrl: './configuracion-geofence.component.scss',
})
export class ConfiguracionGeofenceComponent implements OnInit, AfterViewInit, OnDestroy {
  public titulo = 'Configuración Zona de Asistencia';
  public cargando = true;
  public guardando = false;
  public poligono: number[][] = [];
  public mapa: L.Map | null = null;
  public capaPoligono: L.Polygon | null = null;
  public marcadores: L.CircleMarker[] = [];
  public dibujando = false;
  public puntosTemporales: number[][] = [];

  private latDefault = 4.8691;
  private lngDefault = -74.0617;
  private zoomDefault = 17;

  constructor(
    private router: Router,
    private configuracionService: ConfiguracionGlobalService
  ) {}

  ngOnInit() {
    this.cargarPoligono();
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    if (this.mapa) { this.mapa.remove(); this.mapa = null; }
  }

  inicializarMapa() {
    const iconDefault = L.icon({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41],
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.mapa = L.map('mapa-geofence', {
      center: [this.latDefault, this.lngDefault],
      zoom: this.zoomDefault,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 20,
    }).addTo(this.mapa);

    // Forzar recalcular tamaño del mapa
    setTimeout(() => { this.mapa?.invalidateSize(); }, 300);

    // Clic en mapa para agregar puntos cuando está en modo dibujo
    this.mapa.on('click', (e: L.LeafletMouseEvent) => {
      if (!this.dibujando) return;
      this.agregarPunto(e.latlng.lat, e.latlng.lng);
    });

    // Doble clic para cerrar el polígono
    this.mapa.on('dblclick', (e: L.LeafletMouseEvent) => {
      if (!this.dibujando) return;
      e.originalEvent.preventDefault();
      this.cerrarPoligono();
    });
  }

  // === MODO DIBUJO ===

  iniciarDibujo() {
    if (this.poligono.length > 0) {
      Swal.fire({
        title: 'Ya existe una zona',
        text: '¿Deseas reemplazarla con una nueva?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, dibujar nueva',
        cancelButtonText: 'Cancelar',
      }).then((result) => {
        if (result.isConfirmed) {
          this.limpiarTodo();
          this.activarDibujo();
        }
      });
    } else {
      this.activarDibujo();
    }
  }

  activarDibujo() {
    this.dibujando = true;
    this.puntosTemporales = [];
    this.limpiarMarcadores();
    if (this.capaPoligono && this.mapa) {
      this.mapa.removeLayer(this.capaPoligono);
      this.capaPoligono = null;
    }
  }

  agregarPunto(lat: number, lng: number) {
    this.puntosTemporales.push([lat, lng]);

    // Marcador visual del punto
    if (this.mapa) {
      const marcador = L.circleMarker([lat, lng], {
        radius: 6, color: '#d4af37', fillColor: '#d4af37', fillOpacity: 1, weight: 2,
      }).addTo(this.mapa);
      this.marcadores.push(marcador);

      // Dibujar línea temporal entre puntos
      if (this.puntosTemporales.length > 1) {
        this.dibujarLineasTemporales();
      }
    }
  }

  dibujarLineasTemporales() {
    if (!this.mapa) return;
    // Remover polígono temporal anterior
    if (this.capaPoligono) { this.mapa.removeLayer(this.capaPoligono); }

    if (this.puntosTemporales.length >= 2) {
      const latlngs: L.LatLngExpression[] = this.puntosTemporales.map(p => [p[0], p[1]] as L.LatLngExpression);
      this.capaPoligono = L.polyline(latlngs as any, { color: '#d4af37', weight: 2, dashArray: '5,10', opacity: 0.7 }).addTo(this.mapa) as any;
    }
  }

  cerrarPoligono() {
    if (this.puntosTemporales.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Mínimo 3 puntos', text: 'Necesitas al menos 3 puntos para crear una zona' });
      return;
    }

    this.dibujando = false;
    this.poligono = [...this.puntosTemporales];
    this.puntosTemporales = [];
    this.limpiarMarcadores();
    this.dibujarPoligonoFinal();
  }

  cancelarDibujo() {
    this.dibujando = false;
    this.puntosTemporales = [];
    this.limpiarMarcadores();
    if (this.capaPoligono && this.mapa) {
      this.mapa.removeLayer(this.capaPoligono);
      this.capaPoligono = null;
    }
    // Redibujar polígono guardado si existía
    if (this.poligono.length > 0) {
      this.dibujarPoligonoFinal();
    }
  }

  deshacerUltimoPunto() {
    if (this.puntosTemporales.length === 0) return;
    this.puntosTemporales.pop();
    // Remover último marcador
    if (this.marcadores.length > 0) {
      const ultimo = this.marcadores.pop();
      if (ultimo && this.mapa) this.mapa.removeLayer(ultimo);
    }
    // Redibujar líneas
    if (this.capaPoligono && this.mapa) {
      this.mapa.removeLayer(this.capaPoligono);
      this.capaPoligono = null;
    }
    if (this.puntosTemporales.length >= 2) {
      this.dibujarLineasTemporales();
    }
  }

  // === UTILIDADES DE MAPA ===

  limpiarMarcadores() {
    if (this.mapa) {
      this.marcadores.forEach(m => this.mapa!.removeLayer(m));
    }
    this.marcadores = [];
  }

  limpiarTodo() {
    this.poligono = [];
    this.puntosTemporales = [];
    this.limpiarMarcadores();
    if (this.capaPoligono && this.mapa) {
      this.mapa.removeLayer(this.capaPoligono);
      this.capaPoligono = null;
    }
  }

  dibujarPoligonoFinal() {
    if (!this.mapa || this.poligono.length < 3) return;
    if (this.capaPoligono) { this.mapa.removeLayer(this.capaPoligono); }

    const latlngs: L.LatLngExpression[] = this.poligono.map(p => [p[0], p[1]] as L.LatLngExpression);
    this.capaPoligono = L.polygon(latlngs, { color: '#d4af37', weight: 3, fillOpacity: 0.2, fillColor: '#d4af37' }).addTo(this.mapa);
    this.mapa.fitBounds(this.capaPoligono.getBounds(), { padding: [50, 50] });
  }

  // === CARGA Y GUARDADO ===

  cargarPoligono() {
    this.cargando = true;
    this.configuracionService.obtenerByClave('asistencia_geofence_poligono').subscribe({
      next: (r: any) => {
        const data = r.body;
        if (data && data.valor_texto) {
          try { this.poligono = JSON.parse(data.valor_texto); } catch (e) { console.error('Error al parsear polígono:', e); }
        }
        this.cargando = false;
        setTimeout(() => {
          this.inicializarMapa();
          setTimeout(() => {
            this.mapa?.invalidateSize();
            this.dibujarPoligonoFinal();
          }, 500);
        }, 300);
      },
      error: () => {
        this.cargando = false;
        setTimeout(() => {
          this.inicializarMapa();
          setTimeout(() => this.mapa?.invalidateSize(), 500);
        }, 300);
      },
    });
  }

  guardar() {
    if (this.poligono.length < 3) {
      Swal.fire({ icon: 'warning', title: 'Polígono incompleto', text: 'Dibuja una zona con al menos 3 puntos en el mapa' });
      return;
    }

    this.guardando = true;
    const valorTexto = JSON.stringify(this.poligono);

    this.configuracionService.actualizarByClave('asistencia_geofence_poligono', valorTexto).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({ icon: 'success', title: 'Zona guardada', text: 'La zona de asistencia se ha guardado correctamente', timer: 2500, showConfirmButton: false });
      },
      error: () => {
        this.configuracionService.crear({
          clave: 'asistencia_geofence_poligono',
          valor_texto: valorTexto,
          descripcion: 'Polígono de la zona de asistencia (JSON con coordenadas)',
        }).subscribe({
          next: () => {
            this.guardando = false;
            Swal.fire({ icon: 'success', title: 'Zona guardada', text: 'La zona de asistencia se ha creado correctamente', timer: 2500, showConfirmButton: false });
          },
          error: () => {
            this.guardando = false;
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la zona' });
          },
        });
      },
    });
  }

  centrarEnMiUbicacion() {
    if (!navigator.geolocation) { Swal.fire({ icon: 'warning', title: 'Sin GPS', text: 'Tu navegador no soporta geolocalización' }); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (this.mapa) {
          this.mapa.setView([pos.coords.latitude, pos.coords.longitude], 18);
          L.marker([pos.coords.latitude, pos.coords.longitude]).addTo(this.mapa).bindPopup('Tu ubicación actual').openPopup();
        }
      },
      () => Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo obtener tu ubicación' }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  limpiarPoligono() {
    Swal.fire({
      title: '¿Limpiar zona?', text: 'Se eliminará el polígono dibujado', icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, limpiar', cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) { this.limpiarTodo(); }
    });
  }
}