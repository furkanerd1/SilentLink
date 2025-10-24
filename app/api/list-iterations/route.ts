import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log("[Iterations] Custom Vision iterations listeleniyor...");
    
    const predictionKey = process.env.NEXT_PUBLIC_CUSTOM_VISION_PREDICTION_KEY;
    const endpoint = process.env.NEXT_PUBLIC_CUSTOM_VISION_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_CUSTOM_VISION_PROJECT_ID;

    // Environment variables kontrolü
    if (!predictionKey || !endpoint || !projectId) {
      console.error("[Iterations] Environment değişkenleri eksik");
      return NextResponse.json({
        success: false,
        error: 'Custom Vision environment değişkenleri eksik',
        missing: {
          predictionKey: !predictionKey,
          endpoint: !endpoint,
          projectId: !projectId
        }
      }, { status: 400 });
    }

    // Iterations listesi için API URL'i
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const apiUrl = `${cleanEndpoint}/customvision/v3.0/Training/projects/${projectId}/iterations`;
    console.log('[Iterations] API URL:', apiUrl);

    // Azure Custom Vision Training API'ye istek gönder
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Training-Key': predictionKey, // Training key olarak prediction key'i kullan
        'Content-Type': 'application/json',
      },
    });

    console.log('[Iterations] Azure response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Iterations] Azure API hatası:', errorText);
      
      return NextResponse.json({
        success: false,
        error: 'Azure Iterations API hatası',
        status: response.status,
        statusText: response.statusText,
        errorDetails: errorText,
        apiUrl: apiUrl
      }, { status: response.status });
    }

    const iterations = await response.json();
    console.log('[Iterations] Azure iterations data:', iterations);

    // Published iterations'ları filtrele
    const publishedIterations = iterations.filter((iter: any) => iter.publishName && iter.status === 'Completed');

    return NextResponse.json({
      success: true,
      message: 'Iterations başarıyla listelendi',
      data: {
        allIterations: iterations,
        publishedIterations: publishedIterations,
        count: iterations.length,
        publishedCount: publishedIterations.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Iterations] Genel hata:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Iterations listesi alınamadı',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}