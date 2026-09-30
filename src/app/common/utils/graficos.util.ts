import { Chart } from 'chart.js';

/**
 * Destruye todos los graficos de Chart.js cuyo canvas esta dentro del elemento indicado.
 * Se usa en el ngOnDestroy de los componentes con graficos: si no se destruyen, Chart.js
 * deja vivos sus listeners de resize y animaciones sobre canvas que ya no existen y la
 * aplicacion se bloquea al navegar a otra pantalla (por ejemplo al volver al menu).
 * Se busca por contenedor y no por id porque cuando corre ngOnDestroy el DOM del
 * componente puede estar ya fuera del documento y document.getElementById no lo encuentra.
 */
export function destruirGraficosDe(contenedor: HTMLElement | null | undefined): void {
  if (!contenedor) return;
  Object.values(Chart.instances).forEach((grafico: Chart) => {
    if (grafico?.canvas && contenedor.contains(grafico.canvas)) {
      grafico.destroy();
    }
  });
}
