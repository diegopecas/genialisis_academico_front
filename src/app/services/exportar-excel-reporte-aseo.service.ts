import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

/**
 * Exporta el reporte de aseo a Excel (.xlsx), siguiendo el mismo patrón que el
 * componente de tablas: json_to_sheet + book_new + writeFile.
 * Una sola hoja; la primera columna cambia según se agrupe por fecha o por área.
 */
@Injectable({
    providedIn: 'root'
})
export class ExportarExcelReporteAseoService {

    /**
     * datos: { proceso, agruparPor: 'fecha'|'area', filas: [...] }
     * cada fila: { fecha, area, horario, mobiliario, consumo, ejecutor, supervisor, estado }
     */
    generarExcel(datos: any) {
        const porArea = datos.agruparPor === 'area';
        const filas = datos.filas || [];

        // Cada fila es un objeto cuyas claves son los encabezados (igual que en tablas).
        // Por Área: columnas Área, Fecha, Horario, ...
        // Por Fecha: columnas Fecha, Horario, Área, ... (Estado se quita en ambos)
        const datosExportar = filas.map((f: any) => {
            const fila: any = {};
            const fechaTexto = this.formatearFecha(f.fecha);
            if (porArea) {
                fila['Área'] = f.area;
                fila['Fecha'] = fechaTexto;
                fila['Horario'] = f.horario;
            } else {
                fila['Fecha'] = fechaTexto;
                fila['Horario'] = f.horario;
                fila['Área'] = f.area;
            }
            fila['Mobiliario aseado'] = f.mobiliario;
            fila['Ejecutó'] = f.ejecutor || '';
            fila['Supervisó'] = f.supervisor || '';
            return fila;
        });

        const ws = XLSX.utils.json_to_sheet(datosExportar);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

        // Segunda hoja: productos utilizados con su modo de uso (sin cantidades)
        const productos = datos.productosUsados || [];
        if (productos.length > 0) {
            const datosProd = productos.map((p: any) => ({
                'Producto': p.producto,
                'Modo de uso': p.modo_uso || ''
            }));
            const wsProd = XLSX.utils.json_to_sheet(datosProd);
            wsProd['!cols'] = [{ wch: 30 }, { wch: 80 }];
            XLSX.utils.book_append_sheet(wb, wsProd, 'Productos');
        }

        const proceso = (datos.proceso || 'Aseo').replace(/\s+/g, '_');
        XLSX.writeFile(wb, `Reporte_${proceso}_${new Date().getTime()}.xlsx`);
    }

    private formatearFecha(fecha: string): string {
        if (!fecha || fecha === '0000-00-00') return '';
        try {
            const date = new Date(fecha + 'T00:00:00');
            if (isNaN(date.getTime())) return fecha;
            return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch {
            return fecha;
        }
    }
}