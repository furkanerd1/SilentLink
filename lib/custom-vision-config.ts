// Azure Custom Vision konfigürasyon ayarları

export const CUSTOM_VISION_CONFIG = {
  predictionKey: process.env.NEXT_PUBLIC_CUSTOM_VISION_PREDICTION_KEY || "",
  endpoint: process.env.NEXT_PUBLIC_CUSTOM_VISION_ENDPOINT || "",
  projectId: process.env.NEXT_PUBLIC_CUSTOM_VISION_PROJECT_ID || "",
  modelName: process.env.NEXT_PUBLIC_CUSTOM_VISION_MODEL_NAME || "SignLanguageRecognition",
  
  // API ayarları
  apiVersion: "3.0",
  contentType: "application/octet-stream",
  
  // Threshold değerleri
  confidenceThreshold: 0.5, // Minimum güven skoru
  maxPredictions: 5, // Maximum tahmin sayısı
  
  // Analiz ayarları
  captureInterval: 2000, // 2 saniyede bir görüntü analizi (ms)
  imageQuality: 0.8, // JPEG kalitesi (0-1)
  maxImageSize: 1024, // Maximum görüntü boyutu (px)
};

// İşaret dili etiketlerinin Türkçe çevirileri
export const SIGN_LANGUAGE_LABELS: Record<string, string> = {
  "hello": "Merhaba",
  "thank_you": "Teşekkür ederim",
  "please": "Lütfen",
  "yes": "Evet",
  "no": "Hayır",
  "help": "Yardım",
  "money": "Para",
  "card": "Kart",
  "account": "Hesap",
  "transfer": "Transfer",
  "loan": "Kredi",
  "payment": "Ödeme",
  "balance": "Bakiye",
  "withdraw": "Para çekme",
  "deposit": "Para yatırma",
  // Daha fazla etiket eklenebilir
};

// API URL'lerini oluşturan yardımcı fonksiyonlar
export const buildPredictionUrl = () => {
  const { endpoint, projectId, modelName, apiVersion } = CUSTOM_VISION_CONFIG;
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  // Object Detection için detect endpoint'ini kullan
  return `${cleanEndpoint}/customvision/v${apiVersion}/Prediction/${projectId}/detect/iterations/${modelName}/image/noStore`;
};

export const getPredictionHeaders = () => {
  return {
    'Prediction-Key': CUSTOM_VISION_CONFIG.predictionKey,
    'Content-Type': CUSTOM_VISION_CONFIG.contentType,
  };
};