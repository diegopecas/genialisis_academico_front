import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';

export interface ThemeConfig {
  name: string;
  month: number;
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  title: string;
  subtitle: string;
  decorativeElements: string[];
  inputIcons: {
    user: string;
    password: string;
  };
  centerIcon: string;
  buttonText: string;
  placeholders: {
    user: string;
    password: string;
  };
  particleIcons: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  constructor(private institucionConfigService: InstitucionConfigService) {}

  private getThemeTitle(): string {
    return this.institucionConfigService.getNombreInstitucion() || 'INSTITUCIÓN EDUCATIVA';
  }

  private themes: ThemeConfig[] = [
    // Enero - Año Nuevo
    {
      name: 'new-year',
      month: 1,
      backgroundColor: 'linear-gradient(to bottom, #0a0520 0%, #1a1040 50%, #2d1560 100%)',
      primaryColor: '#ffd700',
      secondaryColor: '#ff1493',
      accentColor: '#00ffff',
      title: '', // Se llenará dinámicamente
      subtitle: '✨ Nuevo Año, Nuevos Sueños ✨',
      decorativeElements: ['🎆', '🎊', '✨', '🎉'],
      inputIcons: { user: '⭐', password: '🎆' },
      centerIcon: '🎊',
      buttonText: 'INICIAR AÑO',
      placeholders: { user: 'Usuario del Nuevo Año...', password: 'Contraseña...' },
      particleIcons: ['✨', '🎊', '🎆', '⭐']
    },
    // Febrero - San Valentín
    {
      name: 'valentine',
      month: 2,
      backgroundColor: 'linear-gradient(to bottom, #2d0a1e 0%, #4a0a2e 50%, #6d1040 100%)',
      primaryColor: '#ff1493',
      secondaryColor: '#ff69b4',
      accentColor: '#ffb6c1',
      title: '',
      subtitle: '💕 Con Amor y Dedicación 💕',
      decorativeElements: ['💖', '💝', '💗', '💓'],
      inputIcons: { user: '💕', password: '💝' },
      centerIcon: '💖',
      buttonText: 'ENTRAR CON AMOR',
      placeholders: { user: 'Usuario con cariño...', password: 'Contraseña...' },
      particleIcons: ['💕', '💖', '💗', '💝']
    },
    // Marzo - Primavera
    {
      name: 'spring',
      month: 3,
      backgroundColor: 'linear-gradient(to bottom, #1a3a1a 0%, #2d5a2d 50%, #407a40 100%)',
      primaryColor: '#32cd32',
      secondaryColor: '#ff69b4',
      accentColor: '#ffff00',
      title: '',
      subtitle: '🌸 Floreciendo con Conocimiento 🌸',
      decorativeElements: ['🌸', '🦋', '🌺', '🌼'],
      inputIcons: { user: '🌱', password: '🌸' },
      centerIcon: '🌻',
      buttonText: 'FLORECER',
      placeholders: { user: 'Usuario primaveral...', password: 'Contraseña...' },
      particleIcons: ['🌸', '🌺', '🦋', '🌼']
    },
    // Abril - Pascua
    {
      name: 'easter',
      month: 4,
      backgroundColor: 'linear-gradient(to bottom, #4a2a0a 0%, #6a4a2a 50%, #8a6a4a 100%)',
      primaryColor: '#ffd700',
      secondaryColor: '#ff69b4',
      accentColor: '#87ceeb',
      title: '',
      subtitle: '🐰 Renovación y Esperanza 🐰',
      decorativeElements: ['🐰', '🥚', '🐣', '🌷'],
      inputIcons: { user: '🐰', password: '🥚' },
      centerIcon: '🐣',
      buttonText: 'RENOVAR',
      placeholders: { user: 'Usuario renovado...', password: 'Contraseña...' },
      particleIcons: ['🐰', '🥚', '🐣', '🌷']
    },
    // Mayo - Día de las Madres
    {
      name: 'mothers-day',
      month: 5,
      backgroundColor: 'linear-gradient(to bottom, #2d1a3a 0%, #4a2a5a 50%, #6a4a7a 100%)',
      primaryColor: '#ff69b4',
      secondaryColor: '#dda0dd',
      accentColor: '#fff',
      title: '',
      subtitle: '👩 Celebrando a Mamá 👩',
      decorativeElements: ['🌹', '💐', '🌺', '💝'],
      inputIcons: { user: '🌹', password: '💐' },
      centerIcon: '💝',
      buttonText: 'ENTRAR CON AMOR',
      placeholders: { user: 'Usuario especial...', password: 'Contraseña...' },
      particleIcons: ['🌹', '💐', '🌺', '💝']
    },
    // Junio - Verano
    {
      name: 'summer',
      month: 6,
      backgroundColor: 'linear-gradient(to bottom, #0a3a5a 0%, #1a5a8a 50%, #2a7aba 100%)',
      primaryColor: '#ffd700',
      secondaryColor: '#ff8c00',
      accentColor: '#00bfff',
      title: '',
      subtitle: '☀️ Verano de Aprendizaje ☀️',
      decorativeElements: ['☀️', '🌊', '🏖️', '🍉'],
      inputIcons: { user: '🌊', password: '☀️' },
      centerIcon: '🏖️',
      buttonText: 'DISFRUTAR',
      placeholders: { user: 'Usuario veraniego...', password: 'Contraseña...' },
      particleIcons: ['☀️', '🌊', '🏖️', '⛱️']
    },
    // Julio - Patria Colombia
    {
      name: 'colombia-day',
      month: 7,
      backgroundColor: 'linear-gradient(to bottom, #1a1a3a 0%, #2a2a5a 50%, #3a3a7a 100%)',
      primaryColor: '#fcd116',
      secondaryColor: '#003893',
      accentColor: '#ce1126',
      title: '',
      subtitle: '🇨🇴 Orgullo Colombiano 🇨🇴',
      decorativeElements: ['🇨🇴', '⭐', '🎆', '🎉'],
      inputIcons: { user: '⭐', password: '🇨🇴' },
      centerIcon: '🇨🇴',
      buttonText: 'VIVA COLOMBIA',
      placeholders: { user: 'Usuario patriota...', password: 'Contraseña...' },
      particleIcons: ['🇨🇴', '⭐', '🎆', '🎉']
    },
    // Agosto - Cometas
    {
      name: 'kites',
      month: 8,
      backgroundColor: 'linear-gradient(to bottom, #2a3a5a 0%, #4a5a8a 50%, #6a7aba 100%)',
      primaryColor: '#00bfff',
      secondaryColor: '#ff69b4',
      accentColor: '#ffd700',
      title: '',
      subtitle: '🪁 Volando Alto 🪁',
      decorativeElements: ['🪁', '☁️', '🌈', '🦅'],
      inputIcons: { user: '🪁', password: '☁️' },
      centerIcon: '🪁',
      buttonText: 'VOLAR ALTO',
      placeholders: { user: 'Usuario volador...', password: 'Contraseña...' },
      particleIcons: ['🪁', '☁️', '🌈', '✨']
    },
    // Septiembre - Amor y Amistad
    {
      name: 'love-friendship',
      month: 9,
      backgroundColor: 'linear-gradient(to bottom, #3a1a2a 0%, #5a2a4a 50%, #7a3a6a 100%)',
      primaryColor: '#ff1493',
      secondaryColor: '#ff69b4',
      accentColor: '#ffd700',
      title: '',
      subtitle: '💖 Amor y Amistad 💖',
      decorativeElements: ['💖', '💕', '🎁', '🎈'],
      inputIcons: { user: '💕', password: '💖' },
      centerIcon: '💝',
      buttonText: 'ENTRAR CON AMOR',
      placeholders: { user: 'Usuario amoroso...', password: 'Contraseña...' },
      particleIcons: ['💖', '💕', '💝', '🎁']
    },
    // Octubre - Halloween
    {
      name: 'halloween',
      month: 10,
      backgroundColor: 'linear-gradient(to bottom, #0a0a1a 0%, #1a0a2e 50%, #2d1b3d 100%)',
      primaryColor: '#ff8c00',
      secondaryColor: '#8a2be2',
      accentColor: '#dda0dd',
      title: '',
      subtitle: '🕸️ Portal de las Sombras 🕸️',
      decorativeElements: ['🦇', '👻', '🕷️', '🕸️'],
      inputIcons: { user: '💀', password: '🕷️' },
      centerIcon: '🎃',
      buttonText: 'ATRAVESAR PORTAL',
      placeholders: { user: 'Usuario del Más Allá...', password: 'Clave Secreta...' },
      particleIcons: ['🎃', '💀', '🕷️', '🕸️']
    },
    // Noviembre - Acción de Gracias
    {
      name: 'thanksgiving',
      month: 11,
      backgroundColor: 'linear-gradient(to bottom, #3a2a1a 0%, #5a4a2a 50%, #7a6a4a 100%)',
      primaryColor: '#ff8c00',
      secondaryColor: '#8b4513',
      accentColor: '#ffd700',
      title: '',
      subtitle: '🍂 Gratitud y Abundancia 🍂',
      decorativeElements: ['🍂', '🦃', '🌾', '🍁'],
      inputIcons: { user: '🍂', password: '🌾' },
      centerIcon: '🦃',
      buttonText: 'DAR GRACIAS',
      placeholders: { user: 'Usuario agradecido...', password: 'Contraseña...' },
      particleIcons: ['🍂', '🍁', '🌾', '🦃']
    },
    // Diciembre - Navidad MÁGICA INVERNAL ❄️✨
    {
      name: 'christmas',
      month: 12,
      backgroundColor: 'linear-gradient(to bottom, #0a1428 0%, #1a2850 50%, #2a3c78 100%)',
      primaryColor: '#e0f4ff',
      secondaryColor: '#4dd0ff',
      accentColor: '#ffffff',
      title: '',
      subtitle: '❄️ Magia Invernal ❄️',
      decorativeElements: ['❄️', '⛄', '🎄', '✨', '🎅', '🔔', '⛷️'],
      inputIcons: { user: '🎅', password: '🎁' },
      centerIcon: '🎄',
      buttonText: 'CELEBRAR NAVIDAD',
      placeholders: { user: 'Usuario invernal...', password: 'Contraseña mágica...' },
      particleIcons: ['❄️', '✨', '⭐', '💎', '🎅'] 
    }
  ];

  getCurrentTheme(): ThemeConfig {
    const currentMonth = new Date().getMonth() + 1;
    const theme = this.themes.find(t => t.month === currentMonth) || this.themes[9];
    theme.title = this.getThemeTitle();
    return theme;
  }

  getThemeByMonth(month: number): ThemeConfig {
    const theme = this.themes.find(t => t.month === month) || this.themes[9];
    theme.title = this.getThemeTitle();
    return theme;
  }

  getAllThemes(): ThemeConfig[] {
    return this.themes.map(theme => ({
      ...theme,
      title: this.getThemeTitle()
    }));
  }
}