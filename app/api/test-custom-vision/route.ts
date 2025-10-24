import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] Custom Vision test endpoint çağrıldı');

    // Environment değişkenlerini kontrol et
    const predictionKey = process.env.NEXT_PUBLIC_CUSTOM_VISION_PREDICTION_KEY;
    const endpoint = process.env.NEXT_PUBLIC_CUSTOM_VISION_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_CUSTOM_VISION_PROJECT_ID;
    const modelName = process.env.NEXT_PUBLIC_CUSTOM_VISION_MODEL_NAME;

    console.log('[API] Environment değişkenleri:', {
      predictionKey: predictionKey ? `${predictionKey.substring(0, 10)}...` : 'undefined',
      endpoint,
      projectId,
      modelName
    });

    if (!predictionKey || !endpoint || !projectId || !modelName) {
      return NextResponse.json({
        success: false,
        error: 'Environment değişkenleri eksik',
        missing: {
          predictionKey: !predictionKey,
          endpoint: !endpoint,
          projectId: !projectId,
          modelName: !modelName
        }
      }, { status: 400 });
    }

    // API URL'ini oluştur (endpoint'in sonundaki slash'i temizle)
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    // Object Detection için detectWithNoStore endpoint'ini kullan
    const apiUrl = `${cleanEndpoint}/customvision/v3.0/Prediction/${projectId}/detect/iterations/${modelName}/image/noStore`;
    console.log('[API] API URL:', apiUrl);

    // Test için küçük bir dummy image buffer oluştur (1x1 kırmızı pixel JPEG)
    const testImageBase64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=';
    const arrayBuffer = Buffer.from(testImageBase64, 'base64');

    console.log('[API] Test görüntüsü oluşturuldu, boyut:', arrayBuffer.byteLength, 'bytes');

    // Azure Custom Vision API'ye test isteği gönder
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Prediction-Key': predictionKey,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    console.log('[API] Azure response status:', response.status);
    console.log('[API] Azure response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Azure API hatası:', errorText);
      
      return NextResponse.json({
        success: false,
        error: 'Azure API hatası',
        status: response.status,
        statusText: response.statusText,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('[API] Azure response data:', result);

    return NextResponse.json({
      success: true,
      message: 'Azure Custom Vision bağlantısı başarılı',
      data: result,
      details: {
        apiUrl,
        endpoint,
        projectId,
        modelName,
        predictionUrl: apiUrl,
        requestHeaders: {
          'Prediction-Key': predictionKey.substring(0, 10) + '...',
          'Content-Type': 'application/octet-stream'
        },
        responseHeaders: Object.fromEntries(response.headers.entries())
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[API] Test hatası:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test sırasında hata oluştu',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}