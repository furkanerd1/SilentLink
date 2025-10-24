"use client";

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  type: "sign-to-text" | "audio-to-text" | "speech-to-text";
  content: string;
  timestamp: Date;
  sender: "you" | "representative";
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

// Global state yönetimi için Zustand store
export const useChatStore = create<ChatState>((set: any) => ({
  messages: [],
  addMessage: (message: ChatMessage) => set((state: ChatState) => ({ 
    messages: [...state.messages, message] 
  })),
  clearMessages: () => set({ messages: [] }),
}));

// Dışa aktarılacak yardımcı fonksiyon
export function addSpeechMessage(content: string): void {
  const message: ChatMessage = {
    id: Date.now().toString(),
    type: "speech-to-text",
    content,
    timestamp: new Date(),
    sender: "you"
  };
  
  useChatStore.getState().addMessage(message);
}

// İşaret dili mesajı eklemek için yardımcı fonksiyon
export function addSignLanguageMessage(content: string): void {
  const message: ChatMessage = {
    id: Date.now().toString(),
    type: "sign-to-text",
    content,
    timestamp: new Date(),
    sender: "you"
  };
  
  useChatStore.getState().addMessage(message);
}

// Mesajları almak için yardımcı fonksiyon
export function getMessages(): ChatMessage[] {
  return useChatStore.getState().messages;
}

// Mesajları temizlemek için yardımcı fonksiyon
export function clearAllMessages(): void {
  useChatStore.getState().clearMessages();
}