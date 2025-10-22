"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hand, Volume2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "sign-to-text" | "audio-to-text" | "speech-to-text"
  content: string
  timestamp: Date
  sender: "you" | "representative"
}

// Sınıf bir event emitter olarak çalışacak
class MessageEvents {
  private static instance: MessageEvents;
  private listeners: Function[] = [];

  private constructor() {}

  public static getInstance(): MessageEvents {
    if (!MessageEvents.instance) {
      MessageEvents.instance = new MessageEvents();
    }
    return MessageEvents.instance;
  }

  public addListener(listener: Function): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: Function): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public emit(message: Message): void {
    this.listeners.forEach(listener => listener(message));
  }
}

// Global olarak erişilebilir instance
export const messageEvents = MessageEvents.getInstance();

// Yeni konuşma mesajı eklemek için yardımcı fonksiyon
export function addSpeechMessage(content: string): void {
  const message: Message = {
    id: Date.now().toString(),
    type: "speech-to-text",
    content,
    timestamp: new Date(),
    sender: "you"
  };
  
  messageEvents.emit(message);
}

export function TranslationChat() {
  // Boş mesaj dizisi ile başla, sadece kullanıcının konuşmaları gösterilecek
  const [messages, setMessages] = useState<Message[]>([])
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Mesaj event listener'ını ekle
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };
    
    messageEvents.addListener(handleNewMessage);
    
    return () => {
      messageEvents.removeListener(handleNewMessage);
    };
  }, []);
  
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
    <Card className="flex w-96 flex-col border-l border-border bg-card">
      {/* Chat Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold text-foreground">Konuşma Çevirisi</h2>
        <p className="text-sm text-muted-foreground">Konuşmalarınız burada görüntülenir</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4" style={{height: "calc(100vh - 220px)"}} ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex flex-col gap-2", message.sender === "you" ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="gap-1 text-xs bg-green-600 text-white">
                  <Volume2 className="h-3 w-3" />
                  {message.type === "speech-to-text" ? "Konuşma" : 
                   message.type === "sign-to-text" ? "İşaret Dili" : "Ses"}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(message.timestamp)}
                </span>
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed shadow-sm",
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
      <div className="border-t border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600/10">
            <Volume2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Azure Speech Hizmeti</p>
            <p className="text-xs text-muted-foreground">
              {messages.length === 0 
                ? "Konuşmak için mikrofonu açıp, Speech-to-Text butonuna basın" 
                : `${messages.length} konuşma mesajı kaydedildi`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
