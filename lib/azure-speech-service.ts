"use client";

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { SPEECH_KEY, SPEECH_REGION, DEFAULT_LANGUAGE } from './speech-config';

/**
 * Azure Speech Service entegrasyonu için servis sınıfı
 */
class AzureSpeechService {
  private speechConfig: SpeechSDK.SpeechConfig | null = null;
  private recognizer: SpeechSDK.SpeechRecognizer | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Speech servisini başlat
   */
  private initialize(): void {
    try {
      if (!SPEECH_KEY || SPEECH_KEY === "your-speech-key") {
        console.error("Azure Speech Key henüz ayarlanmamış!");
        return;
      }

      // SpeechConfig oluştur
      this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(SPEECH_KEY, SPEECH_REGION);
      
      // Türkçe olarak ayarla
      this.speechConfig.speechRecognitionLanguage = DEFAULT_LANGUAGE;
      
      console.log("[AzureSpeech] Servis başlatıldı");
    } catch (error) {
      console.error("[AzureSpeech] Başlatma hatası:", error);
    }
  }

  /**
   * Konuşma tanımayı başlat
   * @returns Promise<string> Tanınan metin
   */
  public async startRecognition(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.speechConfig) {
          throw new Error("Speech servis henüz başlatılmamış!");
        }
        
        if (this.isListening) {
          throw new Error("Zaten dinleme aktif!");
        }

        // Mikrofon kaynağı oluştur
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        
        // SpeechRecognizer oluştur
        this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
        
        // Tanıma başladığında tetiklenir
        this.recognizer.recognizing = (sender, event) => {
          console.log(`[AzureSpeech] Tanınıyor: ${event.result.text}`);
        };

        // Tanıma tamamlandığında tetiklenir
        this.recognizer.recognized = (sender, event) => {
          if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const text = event.result.text;
            console.log(`[AzureSpeech] Tanındı: ${text}`);
            
            // Kelime yok ise reddeder
            if (text.trim() === '') {
              reject(new Error("Konuşma algılanamadı"));
            } else {
              resolve(text);
            }
          } else {
            console.warn(`[AzureSpeech] Tanıma başarısız, neden: ${event.result.reason}`);
            reject(new Error(`Tanıma başarısız: ${event.result.reason}`));
          }
        };

        // Hata durumunda tetiklenir
        this.recognizer.canceled = (sender, event) => {
          console.error(`[AzureSpeech] İptal edildi: ${event.reason}`);
          if (event.reason === SpeechSDK.CancellationReason.Error) {
            console.error(`[AzureSpeech] Hata kodu: ${event.errorCode}`);
            console.error(`[AzureSpeech] Hata detayı: ${event.errorDetails}`);
          }
          reject(new Error(`İşlem iptal edildi: ${event.reason}`));
        };

        // Oturum sonlandığında tetiklenir
        this.recognizer.sessionStopped = (sender, event) => {
          console.log('[AzureSpeech] Oturum sonlandı');
          this.cleanUp();
        };

        // Dinlemeyi başlat
        console.log('[AzureSpeech] Konuşma tanıma başlıyor...');
        this.isListening = true;
        
        // Tek seferlik tanıma başlat
        this.recognizer.startContinuousRecognitionAsync(
          () => {
            console.log('[AzureSpeech] Sürekli tanıma başlatıldı');
          },
          (error) => {
            console.error('[AzureSpeech] Tanıma başlatma hatası:', error);
            this.isListening = false;
            reject(error);
          }
        );

      } catch (error) {
        console.error('[AzureSpeech] Tanıma hatası:', error);
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Konuşma tanımayı durdur
   */
  public stopRecognition(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognizer || !this.isListening) {
        console.log('[AzureSpeech] Durdurulacak bir tanıma yok');
        resolve();
        return;
      }
      
      try {
        console.log('[AzureSpeech] Tanıma durduruluyor...');
        
        this.recognizer.stopContinuousRecognitionAsync(
          () => {
            console.log('[AzureSpeech] Tanıma başarıyla durduruldu');
            this.cleanUp();
            resolve();
          },
          (error) => {
            console.error('[AzureSpeech] Tanıma durdurma hatası:', error);
            this.cleanUp();
            reject(error);
          }
        );
      } catch (error) {
        console.error('[AzureSpeech] Tanıma durdurma hatası:', error);
        this.cleanUp();
        reject(error);
      }
    });
  }
  
  /**
   * Tek seferlik konuşma tanıma (başlat ve bitir)
   */
  public async recognizeOnce(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.speechConfig) {
          throw new Error("Speech servis henüz başlatılmamış!");
        }
        
        // Mikrofon kaynağı oluştur
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        
        // SpeechRecognizer oluştur
        const recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
        
        console.log('[AzureSpeech] Tek seferlik tanıma başlıyor...');
        
        // Tek seferlik tanıma başlat
        recognizer.recognizeOnceAsync(
          (result) => {
            if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
              const text = result.text;
              console.log(`[AzureSpeech] Tanındı: ${text}`);
              
              if (text.trim() === '') {
                reject(new Error("Konuşma algılanamadı"));
              } else {
                resolve(text);
              }
            } else {
              console.warn(`[AzureSpeech] Tanıma başarısız, neden: ${result.reason}`);
              reject(new Error(`Tanıma başarısız: ${result.reason}`));
            }
            
            // Kaynakları temizle
            recognizer.close();
          },
          (error) => {
            console.error('[AzureSpeech] Tanıma hatası:', error);
            recognizer.close();
            reject(error);
          }
        );
        
      } catch (error) {
        console.error('[AzureSpeech] Tanıma hatası:', error);
        reject(error);
      }
    });
  }

  /**
   * Kaynakları temizle
   */
  private cleanUp(): void {
    if (this.recognizer) {
      this.recognizer.close();
      this.recognizer = null;
    }
    
    this.isListening = false;
    console.log('[AzureSpeech] Kaynaklar temizlendi');
  }

  /**
   * Tarayıcı Speech SDK'yı destekliyor mu
   */
  public isBrowserSupported(): boolean {
    return !!(typeof window !== 'undefined' && window.navigator && window.navigator.mediaDevices);
  }
}

// Singleton instance
export const azureSpeechService = new AzureSpeechService();