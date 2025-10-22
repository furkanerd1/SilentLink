"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hand, Volume2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  type: "sign-to-text" | "audio-to-text"
  content: string
  timestamp: Date
  sender: "you" | "representative"
}

export function TranslationChat() {
  // Sample messages - will be replaced with Azure AI output
  const [messages] = useState<Message[]>([
    {
      id: "1",
      type: "audio-to-text",
      content: "Hello! Welcome to our bank. How can I assist you today?",
      timestamp: new Date(Date.now() - 120000),
      sender: "representative",
    },
    {
      id: "2",
      type: "sign-to-text",
      content: "I would like to open a new savings account.",
      timestamp: new Date(Date.now() - 90000),
      sender: "you",
    },
    {
      id: "3",
      type: "audio-to-text",
      content: "Excellent! I can help you with that. Do you have any specific requirements for the account?",
      timestamp: new Date(Date.now() - 60000),
      sender: "representative",
    },
    {
      id: "4",
      type: "sign-to-text",
      content: "Yes, I need an account with online banking access.",
      timestamp: new Date(Date.now() - 30000),
      sender: "you",
    },
  ])

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
        <h2 className="text-lg font-semibold text-foreground">Live Translation</h2>
        <p className="text-sm text-muted-foreground">Real-time sign language & audio conversion</p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex flex-col gap-2", message.sender === "you" ? "items-end" : "items-start")}
            >
              <div className="flex items-center gap-2">
                {message.type === "sign-to-text" ? (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Hand className="h-3 w-3" />
                    Sign Language
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Volume2 className="h-3 w-3" />
                    Audio
                  </Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(message.timestamp)}
                </span>
              </div>

              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                  message.sender === "you" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Azure Integration Notice */}
      <div className="border-t border-border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10">
            <Hand className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Azure AI Ready</p>
            <p className="text-xs text-muted-foreground">
              Translation output will appear here when Azure services are connected
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
