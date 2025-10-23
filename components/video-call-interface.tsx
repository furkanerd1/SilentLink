"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  Settings,
  MessageSquare,
  Volume2,
  VolumeX,
  Maximize2,
  Hand,
} from "lucide-react"
import { TranslationChat } from "@/components/translation-chat"
import { SubtitleDisplay } from "@/components/subtitle-display"
import { cn } from "@/lib/utils"
import { Download, X as CloseIcon } from "lucide-react"

export function VideoCallInterface() {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true)
  const [showChat, setShowChat] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isSignLanguageActive, setIsSignLanguageActive] = useState(false)
  const [isSpeechToTextActive, setIsSpeechToTextActive] = useState(false)
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      setCallDuration(0)
    }
    return () => clearInterval(interval)
  }, [isConnected])

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Request camera and microphone access
  const requestMediaAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      setIsVideoEnabled(true)
      setIsAudioEnabled(true)
      setIsConnected(true)
    } catch (error) {
      console.error("Error accessing media devices:", error)
      alert("Unable to access camera/microphone. Please grant permissions.")
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoEnabled(videoTrack.enabled)
      }
    }
  }

  // Toggle audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsAudioEnabled(audioTrack.enabled)
      }
    }
  }

  // End call
  const endCall = () => {
    // Eğer mesajlar varsa kaydetme dialogunu göster
    const { getMessages } = require('@/lib/chat-store');
    const messages = getMessages();
    
    if (messages.length > 0) {
      setShowSaveDialog(true);
    } else {
      // Mesaj yoksa direkt kapat
      closeCallConnection();
    }
  }

  const closeCallConnection = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsVideoEnabled(false)
    setIsAudioEnabled(false)
    setIsConnected(false)
  }

  const handleSaveChat = () => {
    const { getMessages } = require('@/lib/chat-store');
    const messages = getMessages();
    
    // Sohbeti JSON formatında indir
    const chatData = {
      date: new Date().toISOString(),
      duration: callDuration,
      messages: messages
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sohbet-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowSaveDialog(false);
    closeCallConnection();
  }

  const handleDiscardChat = () => {
    setShowSaveDialog(false);
    closeCallConnection();
  }

  useEffect(() => {
    if (isConnected && isAudioEnabled && streamRef.current) {
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(streamRef.current)

      analyser.fftSize = 256
      microphone.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const detectAudio = () => {
        if (analyserRef.current && isAudioEnabled) {
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length
          setAudioLevel(average)
          requestAnimationFrame(detectAudio)
        }
      }

      detectAudio()

      return () => {
        microphone.disconnect()
        audioContext.close()
      }
    }
  }, [isConnected, isAudioEnabled])

  const toggleSignLanguageDetection = () => {
    setIsSignLanguageActive(!isSignLanguageActive)
    // TODO: When backend is ready, call Azure Custom Vision API
    // Example: await fetch('/api/sign-language/toggle', { method: 'POST', body: JSON.stringify({ active: !isSignLanguageActive }) })
    console.log("[v0] Sign language detection:", !isSignLanguageActive ? "activated" : "deactivated")
  }

  const [listeningStatus, setListeningStatus] = useState("");
  
  const toggleSpeechToText = async () => {
    const newState = !isSpeechToTextActive;
    setIsSpeechToTextActive(newState);
    
    try {
      if (newState) {
        // Speech tanımayı başlat
        setListeningStatus("Dinleme başlatılıyor...");
        import('@/lib/azure-speech-service').then(({ azureSpeechService }) => {
          console.log("[Speech] Azure Speech Service başlatılıyor...");
          
          // Sürekli tanıma başlat
          azureSpeechService.startRecognition()
            .then((text) => {
              console.log("[Speech] Tanınan metin:", text);
              setListeningStatus("");
              
              // Tanınan metni chate ekle
              import('@/lib/chat-store').then(({ addSpeechMessage }) => {
                addSpeechMessage(text);
              });
            })
            .catch((error) => {
              console.error("[Speech] Tanıma hatası:", error);
              setListeningStatus("");
              setIsSpeechToTextActive(false);
            });
        });
      } else {
        // Speech tanımayı durdur
        setListeningStatus("Dinleme durduruluyor...");
        import('@/lib/azure-speech-service').then(({ azureSpeechService }) => {
          azureSpeechService.stopRecognition()
            .then(() => {
              console.log("[Speech] Tanıma durduruldu");
              setListeningStatus("");
            })
            .catch((error) => {
              console.error("[Speech] Tanıma durdurma hatası:", error);
              setListeningStatus("");
            });
        });
      }
    } catch (error) {
      console.error("[Speech] Speech service hatası:", error);
      setListeningStatus("");
      setIsSpeechToTextActive(false);
    }
    
    console.log("[Speech] Speech-to-text:", newState ? "aktif" : "pasif");
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Save Chat Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{zIndex: 999}}>
          <Card className="w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Sohbeti Kaydet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Görüşme sırasındaki konuşmaları kaydetmek ister misiniz?
                </p>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Görüşme Süresi:</span>
                <span className="font-medium">{formatDuration(callDuration)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mesaj Sayısı:</span>
                <span className="font-medium">{require('@/lib/chat-store').getMessages().length} mesaj</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDiscardChat}
                className="flex-1"
              >
                Kaydetme
              </Button>
              <Button
                onClick={handleSaveChat}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Kaydet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary">
              <Hand className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-semibold text-foreground">SignBridge</h1>
              <p className="hidden sm:block text-xs md:text-sm text-muted-foreground">Accessible Communication Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {isConnected && (
              <Badge variant="secondary" className="gap-1 sm:gap-1.5 md:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                {formatDuration(callDuration)}
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10">
              <Settings className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Video Area */}
        <div className={cn(
          "flex flex-1 flex-col transition-all duration-300",
          showChat ? "md:mr-0" : ""
        )}>
          <div className="relative h-[calc(100vh-180px)] md:h-[calc(100vh-180px)] bg-muted/30 p-2 md:p-4">
            {/* Remote Video (Bank Representative) */}
            <Card className="relative h-full overflow-hidden bg-card">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <VideoOff className="mx-auto mb-2 md:mb-4 h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
                    <p className="text-sm md:text-lg text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}

              {/* Subtitle Overlay */}
              {isConnected && isSpeechToTextActive && <SubtitleDisplay />}

              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute right-2 top-2 md:right-4 md:top-4 w-32 md:w-64 overflow-hidden rounded-lg border-2 border-border bg-card shadow-lg">
                <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video h-full w-full object-cover" />
                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
                    <div className="text-center">
                      <div className="mx-auto mb-1 md:mb-2 flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-full bg-primary/10">
                        <Video className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Bank Rep</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2">
                  <Badge variant="secondary" className="text-[10px] md:text-xs">
                    Bank Rep
                  </Badge>
                </div>
              </div>

              {/* Microphone activity indicator */}
              {isConnected && isAudioEnabled && audioLevel > 10 && (
                <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 md:bottom-4 md:left-4">
                  <Badge variant="default" className="gap-0.5 sm:gap-1 md:gap-2 bg-green-600 text-[9px] sm:text-[10px] md:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                    <Mic className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Microphone Active</span>
                    <span className="md:hidden">Mic</span>
                  </Badge>
                </div>
              )}

              {isConnected && isSignLanguageActive && (
                <div className="absolute left-1.5 top-1.5 sm:left-2 sm:top-2 md:left-4 md:top-4">
                  <Badge variant="default" className="gap-0.5 sm:gap-1 md:gap-2 bg-accent text-[9px] sm:text-[10px] md:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                    <Hand className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Sign Detection Active</span>
                    <span className="md:hidden">Sign</span>
                  </Badge>
                </div>
              )}

              {isConnected && isSpeechToTextActive && (
                <div className="absolute left-1.5 top-8 sm:left-2 sm:top-10 md:left-4 md:top-14">
                  <Badge variant="default" className="gap-0.5 sm:gap-1 md:gap-2 bg-primary text-[9px] sm:text-[10px] md:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1">
                    <Volume2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                    <span className="hidden md:inline">Speech-to-Text Aktif {listeningStatus && `(${listeningStatus})`}</span>
                    <span className="md:hidden">STT</span>
                  </Badge>
                </div>
              )}
            </Card>
          </div>

          {/* Control Bar - Always full width */}
          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-3 py-2.5 sm:px-4 md:px-6 md:py-3 z-30">
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap max-w-6xl mx-auto">
              {!isConnected ? (
                <Button size="sm" className="gap-1.5 px-5 sm:px-6 md:px-8 text-sm sm:text-base h-9 sm:h-10 md:h-11 font-medium" onClick={requestMediaAccess}>
                  <Video className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                  <span>Aramayı Başlat</span>
                </Button>
              ) : (
                <>
                  {/* Primary Controls */}
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleVideo}
                    className="gap-1 px-2.5 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10 min-w-18 sm:min-w-20"
                  >
                    {isVideoEnabled ? <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" /> : <VideoOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />}
                    <span className="text-xs sm:text-sm">Kamera</span>
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleAudio}
                    className="gap-1 px-2.5 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10 min-w-20 sm:min-w-22"
                  >
                    {isAudioEnabled ? <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" /> : <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />}
                    <span className="text-xs sm:text-sm">Mikrofon</span>
                  </Button>

                  <Button
                    variant={isSpeakerEnabled ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
                    className="gap-1 px-2.5 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10 min-w-20 sm:min-w-22"
                  >
                    {isSpeakerEnabled ? <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" /> : <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />}
                    <span className="text-xs sm:text-sm">Hoparlör</span>
                  </Button>

                  {/* Separator */}
                  <div className="hidden sm:block h-6 md:h-7 w-px bg-border/60" />

                  {/* Feature Controls */}
                  <Button
                    variant={isSignLanguageActive ? "default" : "outline"}
                    size="sm"
                    onClick={toggleSignLanguageDetection}
                    className="gap-1 px-2 sm:px-2.5 md:px-3 whitespace-nowrap h-8 sm:h-9 md:h-10 min-w-22 sm:min-w-24"
                  >
                    <Hand className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />
                    <span className="text-xs sm:text-sm">İşaret Dili</span>
                  </Button>

                  <Button
                    variant={isSpeechToTextActive ? "default" : "outline"}
                    size="sm"
                    onClick={toggleSpeechToText}
                    className="gap-1 px-2 sm:px-2.5 md:px-3 whitespace-nowrap h-8 sm:h-9 md:h-10 min-w-28 sm:min-w-32"
                    disabled={isProcessingSpeech || !isAudioEnabled}
                    title={!isAudioEnabled ? "Konuşma algılama için mikrofon açık olmalı" : ""}
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />
                    <span className="text-xs sm:text-sm">{isSpeechToTextActive ? "Dinleniyor" : "Konuşma Çevir"}</span>
                  </Button>
                  
                  <Button
                    variant={isProcessingSpeech ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      try {
                        setIsProcessingSpeech(true);
                        setListeningStatus("Dinleniyor...");
                        
                        // Tek seferlik tanıma yap
                        const { azureSpeechService } = await import('@/lib/azure-speech-service');
                        console.log("[Speech] Tek seferlik tanıma başlatılıyor...");
                        
                        const text = await azureSpeechService.recognizeOnce();
                        console.log("[Speech] Tanınan metin:", text);
                        
                        // Tanınan metni chate ekle
                        const { addSpeechMessage } = await import('@/lib/chat-store');
                        addSpeechMessage(text);
                      } catch (error) {
                        console.error("[Speech] Tanıma hatası:", error);
                      } finally {
                        setIsProcessingSpeech(false);
                        setListeningStatus("");
                      }
                    }}
                    className="gap-1 px-2 sm:px-2.5 md:px-3 whitespace-nowrap h-8 sm:h-9 md:h-10 min-w-20 sm:min-w-24"
                    disabled={isProcessingSpeech || isSpeechToTextActive || !isAudioEnabled}
                    title={!isAudioEnabled ? "Konuşma algılama için mikrofon açık olmalı" : ""}
                  >
                    <Volume2 className={isProcessingSpeech ? "h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 animate-pulse" : "h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5"} />
                    <span className="text-xs sm:text-sm">{isProcessingSpeech ? "Dinleniyor" : "Tek Çeviri"}</span>
                  </Button>

                  {/* Separator */}
                  <div className="hidden sm:block h-6 md:h-7 w-px bg-border/60" />

                  {/* Utility Controls */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowChat(!showChat)} 
                    className="gap-1 px-2.5 sm:px-3 md:px-4 h-8 sm:h-9 md:h-10 min-w-16 sm:min-w-18"
                  >
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />
                    <span className="text-xs sm:text-sm hidden md:inline">Sohbet</span>
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 px-2.5 sm:px-3 md:px-4 bg-transparent hidden lg:flex h-8 sm:h-9 md:h-10 min-w-24"
                  >
                    <Maximize2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5" />
                    <span className="text-xs sm:text-sm">Tam Ekran</span>
                  </Button>

                  {/* Separator */}
                  <div className="hidden sm:block h-6 md:h-7 w-px bg-border/60" />

                  {/* End Call */}
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={endCall} 
                    className="gap-1 px-2.5 sm:px-3 md:px-4 whitespace-nowrap h-8 sm:h-9 md:h-10 min-w-26 sm:min-w-30 font-medium"
                  >
                    <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4.5 md:w-4.5 rotate-135" />
                    <span className="text-xs sm:text-sm">Aramayı Kapat</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Translation Chat Sidebar - Desktop: sidebar, Mobile: full overlay with close button */}
        {showChat && (
          <>
            {/* Mobile overlay backdrop */}
            <div 
              className="fixed inset-0 bg-black/80 z-40 md:hidden"
              onClick={() => setShowChat(false)}
            />
            {/* Chat panel */}
            <div className={cn(
              "fixed md:relative right-0 top-0 bottom-0 z-50 md:z-auto",
              "w-full sm:w-[85%] md:w-96 sm:max-w-sm md:max-w-none",
              "transition-transform duration-300 ease-in-out",
              "md:translate-x-0",
              "shadow-2xl md:shadow-none"
            )}>
              <TranslationChat onClose={() => setShowChat(false)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
