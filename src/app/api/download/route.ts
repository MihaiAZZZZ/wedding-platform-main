import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

    const blob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
    
    // Extract filename or use a default
    const urlParts = new URL(url).pathname.split('/');
    const filename = urlParts[urlParts.length - 1] || 'wedding-photo.jpg';
    
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new NextResponse(blob, { headers });
  } catch (error) {
    console.error('Error downloading image:', error);
    return new NextResponse('Error downloading image', { status: 500 });
  }
}
