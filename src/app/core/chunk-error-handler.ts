import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class ChunkErrorHandler implements ErrorHandler {

  private reloadIntentos = 0;
  private readonly MAX_REINTENTOS = 2;
  private readonly STORAGE_KEY = 'chunk_reload_count';

  constructor() {
    const count = sessionStorage.getItem(this.STORAGE_KEY);
    this.reloadIntentos = count ? parseInt(count, 10) : 0;
  }

  handleError(error: any): void {
    const message = error?.message || '';
    const esChunkError =
      message.includes('Loading chunk') ||
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('ChunkLoadError');

    if (esChunkError && this.reloadIntentos < this.MAX_REINTENTOS) {
      this.reloadIntentos++;
      sessionStorage.setItem(this.STORAGE_KEY, this.reloadIntentos.toString());
      console.warn(`Chunk loading error detectado. Recargando (intento ${this.reloadIntentos})...`);
      window.location.reload();
      return;
    }

    if (this.reloadIntentos >= this.MAX_REINTENTOS) {
      sessionStorage.removeItem(this.STORAGE_KEY);
      this.reloadIntentos = 0;
    }

    console.error(error);
  }
}