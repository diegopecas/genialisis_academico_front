export const environment = {
  production: false,
  api: "http://localhost:9999/",
  // api: "http://192.168.1.111:9999/"
  // api: "https://api.liceolumen.com/"
  // Configuración para la API de Claude
  claudeApiUrl: 'https://api.anthropic.com/v1/messages',
  claudeApiKey: 'tu-api-key-aquí', // Reemplaza esto con tu API key real

  // Configuración actualizada para la API de Gemini
  geminiApiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  geminiApiKey: 'AIzaSyAwOBLxk9a8FuHQqrHAbohavVKBzxKuJ64',

  // LanguageTool
  languageToolApiUrl: 'https://api.languagetool.org/v2/check',

  // Meta WhatsApp Business
  whatsapp: {
    appId: '1992075778404246',
    configId: '1009442331644081',
    graphVersion: 'v23.0'
  }
};