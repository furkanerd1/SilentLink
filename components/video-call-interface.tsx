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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsVideoEnabled(false)
    setIsAudioEnabled(false)
    setIsConnected(false)
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
              import('@/components/translation-chat').then(({ addSpeechMessage }) => {
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
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Hand className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">SignBridge</h1>
              <p className="text-sm text-muted-foreground">Accessible Communication Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isConnected && (
              <Badge variant="secondary" className="gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                {formatDuration(callDuration)}
              </Badge>
            )}
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex flex-1 flex-col">
          <div className="relative h-[calc(100vh-180px)] bg-muted/30 p-4">
            {/* Remote Video (Bank Representative) */}
            <Card className="relative h-full overflow-hidden bg-card">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <VideoOff className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                    <p className="text-lg text-muted-foreground">Camera Off</p>
                  </div>
                </div>
              )}

              {/* Subtitle Overlay */}
              {isConnected && isSpeechToTextActive && <SubtitleDisplay />}

              {/* Local Video (Picture-in-Picture) */}
              <div className="absolute right-4 top-4 w-64 overflow-hidden rounded-lg border-2 border-border bg-card shadow-lg">
                <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video h-full w-full object-cover" />
                {!isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
                    <div className="text-center">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Video className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-xs text-muted-foreground">Bank Rep</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    Bank Representative
                  </Badge>
                </div>
              </div>

              {/* Microphone activity indicator */}
              {isConnected && isAudioEnabled && audioLevel > 10 && (
                <div className="absolute bottom-4 left-4">
                  <Badge variant="default" className="gap-2 bg-green-600">
                    <Mic className="h-3 w-3" />
                    Microphone Active
                  </Badge>
                </div>
              )}

              {isConnected && isSignLanguageActive && (
                <div className="absolute left-4 top-4">
                  <Badge variant="default" className="gap-2 bg-accent">
                    <Hand className="h-3 w-3" />
                    Sign Detection Active
                  </Badge>
                </div>
              )}

              {isConnected && isSpeechToTextActive && (
                <div className="absolute left-4 top-14">
                  <Badge variant="default" className="gap-2 bg-primary">
                    <Volume2 className="h-3 w-3" />
                    Speech-to-Text Aktif {listeningStatus && `(${listeningStatus})`}
                  </Badge>
                </div>
              )}
            </Card>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card px-6 py-4">
            <div className="flex items-center justify-center gap-3">
              {!isConnected ? (
                <Button size="lg" className="gap-2 px-8" onClick={requestMediaAccess}>
                  <Video className="h-5 w-5" />
                  Start Call
                </Button>
              ) : (
                <>
                  <Button
                    variant={isVideoEnabled ? "secondary" : "destructive"}
                    size="lg"
                    onClick={toggleVideo}
                    className="gap-2"
                  >
                    {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant={isAudioEnabled ? "secondary" : "destructive"}
                    size="lg"
                    onClick={toggleAudio}
                    className="gap-2"
                  >
                    {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant={isSpeakerEnabled ? "secondary" : "outline"}
                    size="lg"
                    onClick={() => setIsSpeakerEnabled(!isSpeakerEnabled)}
                    className="gap-2"
                  >
                    {isSpeakerEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>

                  <div className="mx-2 h-8 w-px bg-border" />

                  <Button
                    variant={isSignLanguageActive ? "default" : "outline"}
                    size="lg"
                    onClick={toggleSignLanguageDetection}
                    className="gap-2"
                  >
                    <Hand className="h-5 w-5" />
                    <span className="text-sm">Sign Language</span>
                  </Button>

                  <Button
                    variant={isSpeechToTextActive ? "default" : "outline"}
                    size="lg"
                    onClick={toggleSpeechToText}
                    className="gap-2"
                    disabled={isProcessingSpeech || !isAudioEnabled}
                    title={!isAudioEnabled ? "Konuşma algılama için mikrofon açık olmalı" : ""}
                  >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm">{isSpeechToTextActive ? "Dinleme Aktif" : "Speech-to-Text"}</span>
                  </Button>
                  
                  <Button
                    variant={isProcessingSpeech ? "default" : "outline"}
                    size="lg"
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
                        const { addSpeechMessage } = await import('@/components/translation-chat');
                        addSpeechMessage(text);
                      } catch (error) {
                        console.error("[Speech] Tanıma hatası:", error);
                      } finally {
                        setIsProcessingSpeech(false);
                        setListeningStatus("");
                      }
                    }}
                    className="gap-2"
                    disabled={isProcessingSpeech || isSpeechToTextActive || !isAudioEnabled}
                    title={!isAudioEnabled ? "Konuşma algılama için mikrofon açık olmalı" : ""}
                  >
                    <Volume2 className={isProcessingSpeech ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
                    <span className="text-sm">{isProcessingSpeech ? "Dinleniyor..." : "Tek Dinleme"}</span>
                  </Button>

                  <div className="mx-2 h-8 w-px bg-border" />

                  <Button variant="outline" size="lg" onClick={() => setShowChat(!showChat)} className="gap-2">
                    <MessageSquare className="h-5 w-5" />
                  </Button>

                  <Button variant="outline" size="lg" className="gap-2 bg-transparent">
                    <Maximize2 className="h-5 w-5" />
                  </Button>

                  <div className="mx-2 h-8 w-px bg-border" />

                  <Button variant="destructive" size="lg" onClick={endCall} className="gap-2">
                    <Phone className="h-5 w-5 rotate-135" />
                    End Call
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Translation Chat Sidebar */}
        {showChat && <TranslationChat />}
      </div>
    </div>
  )
}
