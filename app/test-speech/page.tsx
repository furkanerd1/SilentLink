"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Volume2, MicOff } from 'lucide-react'

export default function TestSpeech() {
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Array<{id: string, text: string}>>([]);
  const [isContinuous, setIsContinuous] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check browser support
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const { azureSpeechService } = await import('@/lib/azure-speech-service');
        setIsSupported(azureSpeechService.isBrowserSupported());
      } catch (err) {
        console.error('Speech SDK yüklenirken hata:', err);
        setIsSupported(false);
        setError('Speech SDK yüklenemedi. Tarayıcı desteğini kontrol edin.');
      }
    };
    
    checkSupport();
  }, []);

  // Function to handle one-time recognition
  const handleRecognizeOnce = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const { azureSpeechService } = await import('@/lib/azure-speech-service');
      const text = await azureSpeechService.recognizeOnce();
      
      if (text) {
        setRecognizedText(text);
        addMessage(text);
      }
    } catch (err: any) {
      console.error('Speech tanıma hatası:', err);
      setError(`Tanıma hatası: ${err.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to handle continuous recognition
  const toggleContinuousRecognition = async () => {
    try {
      const { azureSpeechService } = await import('@/lib/azure-speech-service');
      
      if (!isContinuous) {
        setError(null);
        setIsContinuous(true);
        
        // Start continuous recognition
        azureSpeechService.startRecognition()
          .then((text) => {
            if (text) {
              setRecognizedText(text);
              addMessage(text);
            }
          })
          .catch((err) => {
            console.error('Sürekli tanıma hatası:', err);
            setError(`Sürekli tanıma hatası: ${err.message || 'Bilinmeyen hata'}`);
            setIsContinuous(false);
          });
      } else {
        // Stop continuous recognition
        await azureSpeechService.stopRecognition();
        setIsContinuous(false);
      }
    } catch (err: any) {
      console.error('Konuşma tanıma servisi hatası:', err);
      setError(`Servis hatası: ${err.message || 'Bilinmeyen hata'}`);
      setIsContinuous(false);
    }
  };

  // Add message to the list
  const addMessage = (text: string) => {
    const newMessage = {
      id: Date.now().toString(),
      text
    };
    setMessages(prev => [...prev, newMessage]);
  };

  if (!isSupported) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center">
          <MicOff className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold">Tarayıcı Desteklenmiyor</h1>
          <p className="mt-2 text-muted-foreground">
            Maalesef tarayıcınız mikrofon erişimi veya Speech SDK için gerekli API'leri desteklemiyor.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-6 text-center text-2xl font-bold">Azure Speech Test</h1>
        
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-col gap-4">
          <Button 
            onClick={handleRecognizeOnce} 
            disabled={isProcessing || isContinuous}
            className="w-full"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {isProcessing ? "Dinleniyor..." : "Tek Seferlik Dinleme"}
          </Button>
          
          <Button 
            onClick={toggleContinuousRecognition}
            variant={isContinuous ? "destructive" : "outline"}
            className="w-full"
          >
            <Volume2 className="mr-2 h-4 w-4" />
            {isContinuous ? "Sürekli Dinlemeyi Durdur" : "Sürekli Dinlemeyi Başlat"}
          </Button>
        </div>

        {recognizedText && (
          <div className="mb-4">
            <h2 className="mb-2 font-medium">Son Tanınan:</h2>
            <div className="rounded-md bg-muted p-3">
              {recognizedText}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div>
            <h2 className="mb-2 font-medium">Tanıma Geçmişi:</h2>
            <div className="max-h-60 overflow-y-auto rounded-md border p-2">
              {messages.map((msg) => (
                <div key={msg.id} className="mb-2 rounded bg-muted p-2">
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}