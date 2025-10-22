// Azure Speech SDK için gerekli yapılandırma bilgileri

// Azure portal'dan alınan Speech Service anahtarı
export const SPEECH_KEY = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "your-speech-key";

// Azure Speech Service'in bulunduğu bölge
export const SPEECH_REGION = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "westeurope";

// Varsayılan dil ayarı (Türkçe)
export const DEFAULT_LANGUAGE = "tr-TR";