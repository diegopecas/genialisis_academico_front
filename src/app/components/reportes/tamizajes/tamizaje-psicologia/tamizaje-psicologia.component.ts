import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaz para el tipo de dato
interface Nino {
  nombre: string;
  edad: number;
  socializacion: string;
  lenguaje: string;
  manipulacion: string;
  postural: string;
  prioridad: string;
  observaciones: string;
}

@Component({
  selector: 'app-tamizaje-psicologia',
  templateUrl: './tamizaje-psicologia.component.html',
  styleUrls: ['./tamizaje-psicologia.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TamizajePsicologiaComponent {
  filterAge = 'all';
  filterStatus = 'all';

  // Datos de los 37 niños del tamizaje de psicología (SIN TILDES en las propiedades)
  ninos: Nino[] = [
    { nombre: "Gabriela Chávez García", edad: 40, socializacion: "Acorde", lenguaje: "En proceso", manipulacion: "Adecuado", postural: "Dificultades", prioridad: "Media", observaciones: "Requiere atención en equilibrio y nociones matemáticas" },
    { nombre: "Gabriela Lozano Mercado", edad: 60, socializacion: "Óptimo", lenguaje: "Óptimo", manipulacion: "Óptimo", postural: "Óptimo", prioridad: "Baja", observaciones: "Desarrollo sobresaliente en todas las áreas" },
    { nombre: "Guadalupe Mancera Rodríguez", edad: 29, socializacion: "Acorde", lenguaje: "Acorde", manipulacion: "Acorde", postural: "Acorde", prioridad: "Baja", observaciones: "Desarrollo completamente armónico" },
    { nombre: "Jenny Luciana Flood Martínez", edad: 23, socializacion: "Acorde", lenguaje: "En consolidación", manipulacion: "En proceso", postural: "Adecuado", prioridad: "Media", observaciones: "Fortalecer motricidad fina y marcha hacia atrás" },
    { nombre: "Jeronimo Morales Franco", edad: 25, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Acorde", postural: "Óptimo", prioridad: "Media", observaciones: "Dificultad en reconocimiento de imágenes" },
    { nombre: "Juan Maximiliano Garzón", edad: 18, socializacion: "Esperado", lenguaje: "Leve retraso", manipulacion: "Parcial", postural: "Favorable", prioridad: "Alta", observaciones: "Retraso lenguaje expresivo, requiere seguimiento" },
    { nombre: "Julieta Castellanos Mayorga", edad: 50, socializacion: "Adecuado", lenguaje: "Bueno", manipulacion: "Bueno", postural: "Adecuado", prioridad: "Baja", observaciones: "Desarrollo favorable sin dificultades" },
    { nombre: "Liam Jeronimo Lopez", edad: 47, socializacion: "Acorde", lenguaje: "Con dificultad", manipulacion: "Limitado", postural: "Parcial", prioridad: "Alta", observaciones: "Retraso motricidad fina y habla, evaluación prioritaria" },
    { nombre: "Liam Samuel Yosa Arévalo", edad: 50, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Adecuado", postural: "Satisfactorio", prioridad: "Media", observaciones: "Dificultad en habla y agarre de lápiz" },
    { nombre: "Liam Santiago Garzón", edad: 47, socializacion: "Parcial", lenguaje: "Retraso severo", manipulacion: "Retraso", postural: "Dificultades", prioridad: "Crítica", observaciones: "Retraso global, requiere intervención inmediata" },
    { nombre: "Lorenzo Cuello Vásquez", edad: 25, socializacion: "Adecuado", lenguaje: "Sólido", manipulacion: "Acorde", postural: "Adecuado", prioridad: "Baja", observaciones: "Desarrollo óptimo en todas las áreas" },
    { nombre: "María Victoria Lopez", edad: 37, socializacion: "Retos", lenguaje: "Dificultades", manipulacion: "Esperado", postural: "Retos", prioridad: "Alta", observaciones: "Rezagos en lenguaje y autonomía" },
    { nombre: "Martin Barrantes Rodriguez", edad: 45, socializacion: "Acorde", lenguaje: "Limitado", manipulacion: "Adecuado", postural: "Adecuado", prioridad: "Alta", observaciones: "Retraso lenguaje, requiere fonoaudiología" },
    { nombre: "Martín Castellanos Rodríguez", edad: 51, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Adecuado", postural: "Óptimo", prioridad: "Baja", observaciones: "Perfil armónico completamente acorde" },
    { nombre: "María Paz Pinzón", edad: 42, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Avanzado", postural: "Avanzado", prioridad: "Baja", observaciones: "Desarrollo adelantado en áreas motoras" },
    { nombre: "Juan Esteban Forero", edad: 31, socializacion: "Parcial", lenguaje: "Retraso severo", manipulacion: "Inmaduro", postural: "Parcial", prioridad: "Crítica", observaciones: "Solo balbuceo, sin lenguaje funcional" },
    { nombre: "Emilia Vásquez", edad: 30, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Adecuado", postural: "Favorable", prioridad: "Baja", observaciones: "Desarrollo acorde, leve timidez" },
    { nombre: "Dulce María Garzón Zapata", edad: 46, socializacion: "Favorable", lenguaje: "Avances", manipulacion: "Adecuado", postural: "Adecuado", prioridad: "Baja", observaciones: "Acorde, dificultad nociones temporales" },
    { nombre: "Fátima Caicedo Pachón", edad: 46, socializacion: "Parcial", lenguaje: "Retraso severo", manipulacion: "Retraso", postural: "Retraso", prioridad: "Crítica", observaciones: "Retraso global, evaluación urgente" },
    { nombre: "Flood Paul Timothy", edad: 51, socializacion: "Favorable", lenguaje: "Favorable", manipulacion: "Adecuado", postural: "Óptimo", prioridad: "Media", observaciones: "No reconoce figura humana" },
    { nombre: "Daniel Mathias Rodriguez", edad: 49, socializacion: "Favorable", lenguaje: "Favorable", manipulacion: "En proceso", postural: "Adecuado", prioridad: "Media", observaciones: "Dificultad colores y figura humana" },
    { nombre: "Emanuel Caicedo Pachón", edad: 28, socializacion: "Adecuado", lenguaje: "Retraso", manipulacion: "Acorde", postural: "Parcial", prioridad: "Crítica", observaciones: "Retraso lenguaje, no ejecuta órdenes" },
    { nombre: "Martín Jose Pinilla Latorre", edad: 38, socializacion: "Acorde", lenguaje: "Positivo", manipulacion: "Consolidado", postural: "Apropiado", prioridad: "Baja", observaciones: "Desarrollo óptimo integral" },
    { nombre: "Martin Salgado Jimenez", edad: 48, socializacion: "Adecuado", lenguaje: "Avances", manipulacion: "Bueno", postural: "Favorable", prioridad: "Baja", observaciones: "Acorde, dificultad nociones temporales" },
    { nombre: "Matias Nieto Salgado", edad: 61, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Sólido", postural: "Adecuado", prioridad: "Media", observaciones: "Agarre de lápiz en puño" },
    { nombre: "Miguel Andrés Sandoval González", edad: 26, socializacion: "Retraso", lenguaje: "Retraso severo", manipulacion: "Parcial", postural: "Retraso", prioridad: "Crítica", observaciones: "Retraso global, solo balbuceo" },
    { nombre: "Nathaly Stephania Otalora", edad: 39, socializacion: "Buen nivel", lenguaje: "Progreso", manipulacion: "Bueno", postural: "Adecuado", prioridad: "Media", observaciones: "Respuestas no siempre coherentes" },
    { nombre: "Nicolas Salgado Jimenez", edad: 48, socializacion: "Favorable", lenguaje: "Avances", manipulacion: "Bueno", postural: "Dificultades", prioridad: "Media", observaciones: "Agarre lápiz en puño, dificultad equilibrio" },
    { nombre: "Sol Muñóz Paéz", edad: 35, socializacion: "Favorable", lenguaje: "Retraso", manipulacion: "Adecuado", postural: "Acorde", prioridad: "Alta", observaciones: "Retraso lenguaje expresivo significativo" },
    { nombre: "Thiago Alejandro Lache Sánchez", edad: 53, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Parcial", postural: "Bueno", prioridad: "Media", observaciones: "Dificultad atención y copiar cuadrado" },
    { nombre: "Zarah Villamil Quintana", edad: 39, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "En proceso", postural: "Acorde", prioridad: "Media", observaciones: "Dificultad coordinación viso-motriz" },
    { nombre: "María Elena Canasto Reyes", edad: 31, socializacion: "Bueno", lenguaje: "Acorde", manipulacion: "En proceso", postural: "Adecuado", prioridad: "Media", observaciones: "En consolidación figuras y equilibrio" },
    { nombre: "Allan Fernando González", edad: 35, socializacion: "En proceso", lenguaje: "Retraso", manipulacion: "Adecuado", postural: "Acorde", prioridad: "Alta", observaciones: "Retraso lenguaje, no identifica sexo" },
    { nombre: "Andrés Bohórquez Bernal", edad: 66, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Adecuado", postural: "Óptimo", prioridad: "Baja", observaciones: "Desarrollo completamente armónico" },
    { nombre: "Antonella Garzón Castañeda", edad: 26, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "Favorable", postural: "Adecuado", prioridad: "Baja", observaciones: "Desarrollo óptimo excepcional" },
    { nombre: "Axel Nicolás Alvarado Torres", edad: 41, socializacion: "Adecuado", lenguaje: "Favorable", manipulacion: "En proceso", postural: "Adecuado", prioridad: "Media", observaciones: "Dificultad colores y coordinación" },
    { nombre: "Chloe Adriana Baron Castillo", edad: 32, socializacion: "Acorde", lenguaje: "Sólido", manipulacion: "Bueno", postural: "Esperado", prioridad: "Baja", observaciones: "Desarrollo favorable integral" }
  ];

  get stats() {
    return {
      total: this.ninos.length,
      critica: this.ninos.filter(n => n.prioridad === "Crítica").length,
      alta: this.ninos.filter(n => n.prioridad === "Alta").length,
      media: this.ninos.filter(n => n.prioridad === "Media").length,
      baja: this.ninos.filter(n => n.prioridad === "Baja").length,
      edadPromedio: Math.round(this.ninos.reduce((acc, n) => acc + n.edad, 0) / this.ninos.length)
    };
  }

  get filteredNinos() {
    return this.ninos.filter(n => {
      const ageMatch = this.filterAge === 'all' || 
        (this.filterAge === '18-30' && n.edad >= 18 && n.edad <= 30) ||
        (this.filterAge === '31-45' && n.edad >= 31 && n.edad <= 45) ||
        (this.filterAge === '46-66' && n.edad >= 46 && n.edad <= 66);
      
      const statusMatch = this.filterStatus === 'all' || n.prioridad === this.filterStatus;
      
      return ageMatch && statusMatch;
    });
  }

  getPriorityColor(prioridad: string): string {
    switch(prioridad) {
      case 'Crítica': return 'bg-red-100 text-red-800 border-red-300';
      case 'Alta': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Media': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Baja': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  downloadExcel() {
    const headers = ['Nombre', 'Edad (meses)', 'Socialización', 'Lenguaje', 'Manipulación', 'Postural', 'Prioridad', 'Observaciones'];
    const csvContent = [
      headers.join(','),
      ...this.ninos.map(n => [
        `"${n.nombre}"`,
        n.edad,
        `"${n.socializacion}"`,
        `"${n.lenguaje}"`,
        `"${n.manipulacion}"`,
        `"${n.postural}"`,
        `"${n.prioridad}"`,
        `"${n.observaciones}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tamizaje_psicologia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }
}