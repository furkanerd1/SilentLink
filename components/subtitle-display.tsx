"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"

export function SubtitleDisplay() {
  const [currentSubtitle, setCurrentSubtitle] = useState("")

  // Sample subtitle - will be replaced with Azure Speech-to-Text output
  useEffect(() => {
    const sampleSubtitles = [
      "Hello! Welcome to our bank.",
      "How can I assist you today?",
      "I can help you with that.",
      "",
    ]

    let index = 0
    const interval = setInterval(() => {
      setCurrentSubtitle(sampleSubtitles[index % sampleSubtitles.length])
      index++
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  if (!currentSubtitle) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
      <Card className="bg-background/95 px-6 py-3 backdrop-blur-sm">
        <p className="text-center text-sm font-medium text-foreground">{currentSubtitle}</p>
      </Card>
    </div>
  )
}
