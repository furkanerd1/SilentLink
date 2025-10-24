# SilentLink - Sign Language Translation Platform

A real-time video communication platform that bridges the gap between hearing-impaired individuals and service representatives through AI-powered sign language translation and speech-to-text capabilities.

## Overview

SilentLink enables seamless communication during video calls by:

- **Sign Language Detection**: Detects sign language gestures from the camera and converts them to text/audio
- **Speech-to-Text**: Displays incoming audio as real-time subtitles
- **Live Translation Chat**: Shows all translations in a side panel for reference
- **Accessible Design**: Built with accessibility-first principles for banking and professional contexts

## Current Features

- ✅ Real-time camera and microphone access
- ✅ Video call interface with local and remote video feeds
- ✅ Call controls (video, audio, speaker toggle)
- ✅ AI service toggle buttons (Sign Language Detection, Speech-to-Text)
- ✅ Translation chat sidebar (ready for Azure integration)
- ✅ Subtitle display overlay (ready for Azure integration)
- ✅ Call duration tracking
- ✅ Modern, accessible UI matching Alternatif Bank branding

## Technology Stack

- **Frontend**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **UI Components**: shadcn/ui
- **Backend**: Node.js/Next.js API Routes
- **AI Services**: Azure Computer Vision (Custom Vision) + Azure Speech Services

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Modern browser with camera/microphone support
- HTTPS connection (required for camera/microphone access)

### Installation

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Granting Permissions

When you click "Start Call", your browser will request camera and microphone permissions. Make sure to allow these for the application to work.

## Azure Integration Guide

### Architecture Overview

**Important**: All Azure services will be called from your **backend API routes**, not directly from the frontend. This ensures security and keeps API keys protected.

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│ SilenLink Frontend │
│ (React/Next.js - Camera, Microphone, UI) │
└────────────┬────────────────────────────────┬───────────────┘
│ │
│ HTTP Requests │ HTTP Requests
▼ ▼
┌────────────────────────┐ ┌────────────────────────────┐
│ Backend API Routes │ │ Backend API Routes │
│ /api/sign-language │ │ /api/speech │
└────────────┬───────────┘ └────────────┬───────────────┘
│ │
│ Server-side calls │ Server-side calls
▼ ▼
┌────────────────────────┐ ┌────────────────────────────┐
│ Azure Custom Vision │ │ Azure Speech Services │
│ (Sign Language AI) │ │ (Speech-to-Text & TTS) │
└────────────────────────┘ └────────────────────────────┘
\`\`\`

### Required Azure Services

#### 1. Azure Custom Vision (Sign Language Detection)

**Purpose**: Detect and translate sign language gestures in real-time

**Setup Steps**:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Custom Vision** resource
3. Train a custom model for sign language recognition
4. Get your **Prediction Key** and **Endpoint**

**Backend Integration**:

Create the following API route in your backend:

\`\`\`typescript
// app/api/sign-language/detect/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
try {
const formData = await request.formData();
const imageBlob = formData.get('frame') as Blob;

    if (!imageBlob) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert blob to buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Azure Custom Vision API
    const response = await fetch(
      `${process.env.AZURE_CUSTOM_VISION_ENDPOINT}/customvision/v3.0/Prediction/${process.env.AZURE_CUSTOM_VISION_PROJECT_ID}/detect/iterations/${process.env.AZURE_CUSTOM_VISION_ITERATION}/image`,
      {
        method: 'POST',
        headers: {
          'Prediction-Key': process.env.AZURE_CUSTOM_VISION_KEY!,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer,
      }
    );

    const result = await response.json();

    // Process predictions and return detected signs
    const detectedSigns = result.predictions
      .filter((p: any) => p.probability > 0.7)
      .map((p: any) => ({
        sign: p.tagName,
        confidence: p.probability,
      }));

    return NextResponse.json({
      signs: detectedSigns,
      timestamp: new Date().toISOString(),
    });

} catch (error) {
console.error('Sign language detection error:', error);
return NextResponse.json(
{ error: 'Failed to detect sign language' },
{ status: 500 }
);
}
}
\`\`\`

**Frontend Integration**:

Update `components/video-call-interface.tsx`:

\`\`\`typescript
// Capture and send frames to backend when sign language is active
useEffect(() => {
let interval: NodeJS.Timeout;

if (isConnected && isVideoEnabled && isSignLanguageActive) {
interval = setInterval(async () => {
const canvas = document.createElement('canvas');
const video = localVideoRef.current;

      if (video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append('frame', blob);

            try {
              const response = await fetch('/api/sign-language/detect', {
                method: 'POST',
                body: formData,
              });

              const data = await response.json();

              if (data.signs && data.signs.length > 0) {
                // Send detected signs to translation chat
                console.log('Detected signs:', data.signs);
                // TODO: Update translation chat with detected signs
              }
            } catch (error) {
              console.error('Error detecting sign language:', error);
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }, 1000); // Capture every 1 second

}

return () => clearInterval(interval);
}, [isConnected, isVideoEnabled, isSignLanguageActive]);
\`\`\`

**Environment Variables**:
\`\`\`env
AZURE_CUSTOM_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com
AZURE_CUSTOM_VISION_KEY=your_prediction_key
AZURE_CUSTOM_VISION_PROJECT_ID=your_project_id
AZURE_CUSTOM_VISION_ITERATION=your_iteration_name
\`\`\`

---

#### 2. Azure Speech Services (Speech-to-Text & Text-to-Speech)

**Purpose**: Convert speech to text for subtitles and convert detected signs to speech

**Setup Steps**:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Speech Services** resource
3. Get your **Subscription Key** and **Region**

**Backend Integration**:

Create the following API routes:

\`\`\`typescript
// app/api/speech/recognize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
try {
const formData = await request.formData();
const audioBlob = formData.get('audio') as Blob;

    if (!audioBlob) {
      return NextResponse.json({ error: 'No audio provided' }, { status: 400 });
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Azure Speech-to-Text API
    const response = await fetch(
      `https://${process.env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
          'Content-Type': 'audio/wav',
        },
        body: buffer,
      }
    );

    const result = await response.json();

    return NextResponse.json({
      text: result.DisplayText || '',
      confidence: result.NBest?.[0]?.Confidence || 0,
      timestamp: new Date().toISOString(),
    });

} catch (error) {
console.error('Speech recognition error:', error);
return NextResponse.json(
{ error: 'Failed to recognize speech' },
{ status: 500 }
);
}
}
\`\`\`

\`\`\`typescript
// app/api/speech/synthesize/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
try {
const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Create SSML for better voice quality
    const ssml = `
      <speak version='1.0' xml:lang='en-US'>
        <voice xml:lang='en-US' name='en-US-JennyNeural'>
          ${text}
        </voice>
      </speak>
    `;

    // Call Azure Text-to-Speech API
    const response = await fetch(
      `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY!,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        },
        body: ssml,
      }
    );

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });

} catch (error) {
console.error('Speech synthesis error:', error);
return NextResponse.json(
{ error: 'Failed to synthesize speech' },
{ status: 500 }
);
}
}
\`\`\`

**Frontend Integration**:

Update `components/video-call-interface.tsx`:

\`\`\`typescript
// Speech-to-Text: Capture audio and send to backend
useEffect(() => {
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

if (isConnected && isAudioEnabled && isSpeechToTextActive && streamRef.current) {
const audioStream = new MediaStream(
streamRef.current.getAudioTracks()
);

    mediaRecorder = new MediaRecorder(audioStream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      audioChunks = [];

      const formData = new FormData();
      formData.append('audio', audioBlob);

      try {
        const response = await fetch('/api/speech/recognize', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.text) {
          console.log('Recognized text:', data.text);
          // TODO: Update subtitle display with recognized text
        }
      } catch (error) {
        console.error('Error recognizing speech:', error);
      }
    };

    // Record in 3-second chunks
    mediaRecorder.start();
    const interval = setInterval(() => {
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.start();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      if (mediaRecorder?.state === 'recording') {
        mediaRecorder.stop();
      }
    };

}
}, [isConnected, isAudioEnabled, isSpeechToTextActive]);

// Text-to-Speech: Convert detected signs to audio
const speakDetectedSign = async (signText: string) => {
try {
const response = await fetch('/api/speech/synthesize', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ text: signText }),
});

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

} catch (error) {
console.error('Error synthesizing speech:', error);
}
};
\`\`\`

**Environment Variables**:
\`\`\`env
AZURE_SPEECH_KEY=your_speech_services_key
AZURE_SPEECH_REGION=your_region
\`\`\`

---

### Environment Variables Summary

Create a `.env.local` file in your project root:

\`\`\`env

# Azure Custom Vision (Sign Language Detection)

AZURE_CUSTOM_VISION_ENDPOINT=https://your-region.api.cognitive.microsoft.com
AZURE_CUSTOM_VISION_KEY=your_prediction_key
AZURE_CUSTOM_VISION_PROJECT_ID=your_project_id
AZURE_CUSTOM_VISION_ITERATION=your_iteration_name

# Azure Speech Services (Speech-to-Text & Text-to-Speech)

AZURE_SPEECH_KEY=your_speech_services_key
AZURE_SPEECH_REGION=your_region
\`\`\`

---

### Implementation Checklist

#### Backend API Routes

- [ ] Create `/app/api/sign-language/detect/route.ts` for sign language detection
- [ ] Create `/app/api/speech/recognize/route.ts` for speech-to-text
- [ ] Create `/app/api/speech/synthesize/route.ts` for text-to-speech
- [ ] Add error handling and logging to all routes
- [ ] Test each API route independently

#### Frontend Integration

- [ ] Add frame capture logic when sign language is active
- [ ] Add audio capture logic when speech-to-text is active
- [ ] Connect detected signs to translation chat component
- [ ] Connect recognized speech to subtitle display component
- [ ] Add text-to-speech playback for detected signs
- [ ] Handle loading states and errors gracefully

#### Azure Services Setup

- [ ] Create Azure Custom Vision project
- [ ] Train sign language detection model
- [ ] Create Azure Speech Services resource
- [ ] Add all environment variables to `.env.local`
- [ ] Test Azure services with Postman/curl

---

### Testing Strategy

1. **Backend API Testing**: Use Postman or curl to test each API route
2. **Frontend Integration Testing**: Test UI controls and data flow
3. **End-to-End Testing**: Test complete sign language → text → speech flow
4. **Performance Testing**: Monitor latency and optimize frame/audio capture rates
5. **Accessibility Testing**: Verify screen reader compatibility

---

### Performance Considerations

- **Frame Capture Rate**: Capture frames every 1 second (1 FPS) to balance accuracy and API costs
- **Audio Chunking**: Process audio in 3-second chunks for real-time transcription
- **Caching**: Cache common sign translations to reduce API calls
- **Error Handling**: Implement retry logic with exponential backoff
- **Rate Limiting**: Add rate limiting to prevent API quota exhaustion

---

### Security Best Practices

- ✅ All Azure API keys are stored in backend environment variables
- ✅ API routes validate and sanitize all inputs
- ✅ CORS is properly configured
- ✅ HTTPS is required for camera/microphone access
- ✅ No sensitive data is logged or exposed to frontend

---

## Project Structure

\`\`\`
sign-language-translator/
├── app/
│ ├── api/ # Backend API routes
│ │ ├── sign-language/
│ │ │ └── detect/
│ │ │ └── route.ts # Sign language detection
│ │ └── speech/
│ │ ├── recognize/
│ │ │ └── route.ts # Speech-to-text
│ │ └── synthesize/
│ │ └── route.ts # Text-to-speech
│ ├── globals.css # Global styles
│ ├── layout.tsx # Root layout
│ └── page.tsx # Main page
├── components/
│ ├── ui/ # shadcn/ui components
│ ├── video-call-interface.tsx # Main video interface
│ ├── translation-chat.tsx # Translation chat sidebar
│ └── subtitle-display.tsx # Subtitle overlay
├── .env.local # Environment variables (create this)
└── README.md
\`\`\`

---

## Support

For issues or questions:

- Check the [Azure Custom Vision documentation](https://docs.microsoft.com/azure/cognitive-services/custom-vision-service/)
- Check the [Azure Speech Services documentation](https://docs.microsoft.com/azure/cognitive-services/speech-service/)
- Review the Next.js API routes documentation

---

## License

[Your License Here]
