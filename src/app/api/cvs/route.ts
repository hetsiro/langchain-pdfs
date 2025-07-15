import { NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

export async function GET() {
  try {
    // Verificar si la colección existe
    try {
      await qdrant.getCollection('pdfs');
    } catch {
      return NextResponse.json({ cvs: [] });
    }

    // Buscar todos los puntos
    const searchResult = await qdrant.scroll('pdfs', {
      limit: 1000,
      with_payload: true,
      with_vector: false
    });

    // Devolver todos los puntos tal cual
    return NextResponse.json({ cvs: searchResult.points });
  } catch (error) {
    console.error('Error obteniendo CVs:', error);
    return NextResponse.json(
      { error: 'Error obteniendo CVs del vector store' },
      { status: 500 }
    );
  }
} 