"use client";

import { 
  CUSTOM_VISION_CONFIG, 
  SIGN_LANGUAGE_LABELS, 
  buildPredictionUrl, 
  getPredictionHeaders 
} from './custom-vision-config';

export interface PredictionResult {
  tagName: string;
  probability: number;
  tagNameTurkish: string;
}

export interface CustomVisionResponse {
  id: string;
  project: string;
  iteration: string;
  created: string;
  predictions: Array<{
    tagId: string;
    tagName: string;
    probability: number;
    boundingBox: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
  }>;
}

class CustomVisionService {
  private isAnalyzing = false;
  private lastAnalysisTime = 0;

  /**
   * Blob'dan Custom Vision API'ye görüntü analizi gönderir
   */
  async analyzeImage(imageBlob: Blob): Promise<PredictionResult[]> {
    try {
      // Rate limiting - çok sık analiz yapılmasını engelle
      const now = Date.now();
      if (now - this.lastAnalysisTime < CUSTOM_VISION_CONFIG.captureInterval) {
        console.log("[CustomVision] Rate limit - çok erken tekrar analiz");
        return [];
      }
      this.lastAnalysisTime = now;

      if (this.isAnalyzing) {
        console.log("[CustomVision] Analiz devam ediyor, bekleyin...");
        return [];
      }

      this.isAnalyzing = true;
      console.log("[CustomVision] Görüntü analizi başlatılıyor...");
      console.log("[CustomVision] Blob boyutu:", imageBlob.size, "bytes");
      console.log("[CustomVision] Blob tipi:", imageBlob.type);

      // Environment değişkenlerini kontrol et
      const { predictionKey, endpoint, projectId, modelName } = CUSTOM_VISION_CONFIG;
      console.log("[CustomVision] Konfigürasyon:", {
        predictionKey: predictionKey ? `${predictionKey.substring(0, 10)}...` : 'undefined',
        endpoint,
        projectId,
        modelName
      });

      if (!predictionKey || !endpoint || !projectId || !modelName) {
        throw new Error("Custom Vision konfigürasyonu eksik - environment değişkenlerini kontrol edin");
      }

      const url = buildPredictionUrl();
      const headers = getPredictionHeaders();

      console.log("[CustomVision] API URL:", url);
      console.log("[CustomVision] Headers:", headers);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: imageBlob,
      });

      console.log("[CustomVision] Response status:", response.status);
      console.log("[CustomVision] Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CustomVision] API hatası:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Custom Vision API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result: CustomVisionResponse = await response.json();
      console.log("[CustomVision] API Response:", result);

      // Sonuçları filtrele ve Türkçe etiketlerle birleştir
      const predictions = this.processPredictions(result.predictions);
      
      if (predictions.length > 0) {
        console.log("[CustomVision] Tanınan işaretler:", predictions);
      } else {
        console.log("[CustomVision] Hiçbir işaret tanınmadı veya confidence threshold altında");
      }

      return predictions;

    } catch (error) {
      console.error("[CustomVision] Analiz hatası:", error);
      return [];
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Canvas'tan görüntü alır ve analiz eder
   */
  async analyzeFromCanvas(canvas: HTMLCanvasElement): Promise<PredictionResult[]> {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          const results = await this.analyzeImage(blob);
          resolve(results);
        } else {
          console.error("[CustomVision] Canvas'tan blob oluşturulamadı");
          resolve([]);
        }
      }, 'image/jpeg', CUSTOM_VISION_CONFIG.imageQuality);
    });
  }

  /**
   * Video frame'ini yakalayıp analiz eder
   */
  async analyzeVideoFrame(video: HTMLVideoElement): Promise<PredictionResult[]> {
    try {
      console.log("[CustomVision] Video frame analizi başlıyor...");
      console.log("[CustomVision] Video durumu:", {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        currentTime: video.currentTime,
        paused: video.paused
      });
      
      // Canvas oluştur ve video frame'ini çiz
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error("Canvas context oluşturulamadı");
      }

      // Görüntü boyutunu optimize et
      const maxSize = CUSTOM_VISION_CONFIG.maxImageSize;
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      if (aspectRatio > 1) {
        canvas.width = maxSize;
        canvas.height = maxSize / aspectRatio;
      } else {
        canvas.width = maxSize * aspectRatio;
        canvas.height = maxSize;
      }

      console.log("[CustomVision] Canvas boyutu:", {
        width: canvas.width,
        height: canvas.height,
        aspectRatio: aspectRatio
      });

      // Video frame'ini canvas'a çiz
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      console.log("[CustomVision] Video frame canvas'a çizildi");

      // Canvas'tan analiz et
      const result = await this.analyzeFromCanvas(canvas);
      
      console.log("[CustomVision] Video frame analizi tamamlandı, sonuç:", result);
      
      return result;

    } catch (error) {
      console.error("[CustomVision] Video frame analizi hatası:", error);
      return [];
    }
  }

  /**
   * API'den gelen tahminleri işler ve filtreler (Object Detection)
   */
  private processPredictions(predictions: Array<{
    tagName: string; 
    probability: number;
    boundingBox: { left: number; top: number; width: number; height: number; };
  }>): PredictionResult[] {
    return predictions
      .filter(pred => pred.probability >= CUSTOM_VISION_CONFIG.confidenceThreshold)
      .slice(0, CUSTOM_VISION_CONFIG.maxPredictions)
      .map(pred => ({
        tagName: pred.tagName,
        probability: pred.probability,
        tagNameTurkish: SIGN_LANGUAGE_LABELS[pred.tagName] || pred.tagName
      }))
      .sort((a, b) => b.probability - a.probability);
  }

  /**
   * Sürekli analiz için interval başlatır
   */
  startContinuousAnalysis(
    video: HTMLVideoElement, 
    onResult: (results: PredictionResult[]) => void
  ): () => void {
    console.log("[CustomVision] Sürekli analiz başlatılıyor...");
    
    const interval = setInterval(async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const results = await this.analyzeVideoFrame(video);
        if (results.length > 0) {
          onResult(results);
        }
      }
    }, CUSTOM_VISION_CONFIG.captureInterval);

    // Cleanup fonksiyonu döndür
    return () => {
      console.log("[CustomVision] Sürekli analiz durduruluyor...");
      clearInterval(interval);
    };
  }

  /**
   * Servis durumunu kontrol eder
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test için küçük bir dummy image blob oluştur
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 100, 100);
      }

      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await this.analyzeImage(blob);
              resolve(true);
            } catch {
              resolve(false);
            }
          } else {
            resolve(false);
          }
        }, 'image/jpeg', 0.1);
      });
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const customVisionService = new CustomVisionService();