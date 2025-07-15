import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Guardar el archivo temporalmente
    const uploadDir = join(process.cwd(), 'uploads');
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Procesar el PDF y generar embeddings
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    // Generar un ID único para el PDF
    const pdfId = randomUUID();

    // Mostrar ejemplo de la estructura original
    console.log('=== DOCUMENTO ORIGINAL ===');
    console.log('Primer documento:', JSON.stringify(docs[0], null, 2));

    // Agregar el pdfId como metadato a cada fragmento
    const docsWithMeta = docs.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        pdfId,
        fileName,
      },
    }));

    // Mostrar ejemplo de la estructura modificada
    console.log('=== DOCUMENTO CON METADATA ===');
    console.log('Primer documento con metadata:', JSON.stringify(docsWithMeta[0], null, 2));

    // Crear embeddings y guardar en Qdrant
    const embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    await QdrantVectorStore.fromDocuments(
      docsWithMeta,
      embeddings,
      {
        client: qdrant,
        collectionName: 'pdfs',
      }
    );

    return NextResponse.json({
      message: 'PDF subido y procesado exitosamente',
      fileName,
      pdfId,
      documentCount: docs.length
    });
  } catch (error) {
    console.error('Error subiendo/procesando PDF:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 