"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Hand, Volume2, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore, ChatMessage } from "@/lib/chat-store"

// Yeni konuşma mesajı eklemek için yardımcı fonksiyon
// Bu fonksiyonu burada da tanımlıyoruz geriye dönük uyumluluk için
// Gerçek implementasyon chat-store.ts'te
export function addSpeechMessage(content: string): void {
  const { addSpeechMessage } = require("@/lib/chat-store");
  addSpeechMessage(content);
}

interface TranslationChatProps {
  onClose?: () => void;
}

export function TranslationChat({ onClose }: TranslationChatProps) {
  // Zustand state'inden mesajları al
  const messages = useChatStore(state => state.messages);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Yeni mesaj eklendiğinde otomatik scroll
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current;
      // Kısa bir gecikme ile scroll işlemini gerçekleştir (animasyon için)
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 100);
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card className="flex w-full md:w-96 flex-col border-l border-border bg-card h-full">
      {/* Chat Header */}
      <div className="border-b border-border p-3 md:p-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-base md:text-lg font-semibold text-foreground">Konuşma Çevirisi</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Konuşmalarınız burada görüntülenir</p>
          </div>
          {/* Close button - visible only on mobile */}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8 shrink-0 ml-2"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 md:p-4 min-h-0" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1.5 sm:gap-2", message.sender === "you" ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 mb-0.5 sm:mb-1">
                <Badge variant="default" className="gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] md:text-xs bg-green-600 text-white px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                  <Volume2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                  {message.type === "speech-to-text" ? "Konuşma" : 
                   message.type === "sign-to-text" ? "İşaret Dili" : "Ses"}
                </Badge>
                <span className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
                  <Clock className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3" />
                  {formatTime(message.timestamp)}
                </span>
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 text-[11px] sm:text-xs md:text-sm leading-relaxed shadow-sm",
                  message.sender === "you" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Azure Integration Notice */}
      <div className="border-t border-border bg-card p-3 md:p-4 shrink-0 mt-auto">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex h-8 w-8 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-green-600/10">
            <Volume2 className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-medium text-foreground">Azure Konuşma Tanıma</p>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {messages.length === 0 
                ? "Mikrofonu açıp 'Konuşma Çevir' butonuna basın" 
                : `${messages.length} konuşma mesajı kaydedildi`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
