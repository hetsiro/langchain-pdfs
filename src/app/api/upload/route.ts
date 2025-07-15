import { NextRequest, NextResponse } from 'next/server';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID, createHash } from 'crypto';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Verificar que OpenAI API Key esté configurada
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      );
    }

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

    // Generar hash del contenido del PDF para comparación
    const contentHash = createHash('md5').update(buffer).digest('hex');

    // Extraer el nombre original del archivo (sin timestamp)
    const originalFileName = file.name.replace('.pdf', '');

    // Verificar si ya existe un CV con el mismo contenido o nombre
    try {
      const searchResult = await qdrant.scroll('pdfs', {
        limit: 1000,
        with_payload: true,
        with_vector: false
      });

      const existingCV = searchResult.points.find(point => {
        const payload = point.payload as Record<string, unknown>;
        const metadata = payload?.metadata as Record<string, unknown>;
        const fileName = metadata?.fileName as string;
        const existingContentHash = metadata?.contentHash as string;
        
        // Comparar por contenido (hash) o por nombre
        if (existingContentHash && existingContentHash === contentHash) {
          return true; // Mismo contenido
        }
        
        if (fileName) {
          const existingOriginalName = fileName.split('-').slice(1).join('-').replace('.pdf', '');
          return existingOriginalName === originalFileName;
        }
        return false;
      });

      if (existingCV) {
        const payload = existingCV.payload as Record<string, unknown>;
        const metadata = payload?.metadata as Record<string, unknown>;
        const existingFileName = metadata?.fileName as string;
        const existingOriginalName = existingFileName ? existingFileName.split('-').slice(1).join('-').replace('.pdf', '') : 'CV existente';
        
        return NextResponse.json(
          { error: `Ya existe un CV con el mismo contenido: "${existingOriginalName}"` },
          { status: 409 }
        );
      }
    } catch (error) {
      console.warn('⚠️ Error verificando duplicados:', error);
      // Continuar con la subida si no se puede verificar
    }

    // Procesar el PDF directamente desde el buffer (sin escribir archivo temporal)
    const blob = new Blob([buffer], { type: 'application/pdf' });
    const loader = new PDFLoader(blob);
    const docs = await loader.load();

    // Generar un ID único para el PDF
    const pdfId = randomUUID();

    // Función para limpiar información sensible
    const cleanSensitiveInfo = (text: string) => {
      return text
        // Ocultar emails
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
        // Ocultar números de teléfono
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[TELÉFONO]')
        // Ocultar direcciones IP
        .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
        // Ocultar números de documento (DNI, pasaporte, etc.)
        .replace(/\b\d{7,8}\b/g, '[DOCUMENTO]')
        // Ocultar direcciones físicas específicas
        .replace(/\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct|Plaza|Plz)\b/gi, '[DIRECCIÓN]');
    };

    // Agregar el pdfId como metadato a cada fragmento y limpiar información sensible
    const docsWithMeta = docs.map(doc => ({
      ...doc,
      pageContent: cleanSensitiveInfo(doc.pageContent),
      metadata: {
        ...doc.metadata,
        pdfId,
        fileName: `${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}-${file.name.replace('.pdf', '')}`,
        contentHash, // Agregar hash del contenido
      },
    }));

    // Crear embeddings y guardar en Qdrant
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    try {
      // Verificar si la colección existe y tiene las dimensiones correctas
      try {
        const collection = await qdrant.getCollection('pdfs');
        const vectorSize = collection.config?.params?.vectors?.size;
        console.log('Colección existente, dimensiones:', vectorSize);
        
        // Si la colección existe pero tiene dimensiones diferentes, la eliminamos y recreamos
        if (vectorSize && vectorSize !== 1536) {
          console.log('Eliminando colección con dimensiones incorrectas...');
          await qdrant.deleteCollection('pdfs');
          throw new Error('Recrear colección');
        }
      } catch {
        console.log('Creando colección pdfs con dimensiones correctas...');
        await qdrant.createCollection('pdfs', {
          vectors: {
            size: 1536, // Tamaño de embeddings de text-embedding-3-small
            distance: 'Cosine'
          }
        });
      }

      await QdrantVectorStore.fromDocuments(
        docsWithMeta,
        embeddings,
        {
          client: qdrant,
          collectionName: 'pdfs',
        }
      );

    } catch (vectorError) {
      console.error('Error guardando en Qdrant:', vectorError);
      const errorMessage = vectorError instanceof Error ? vectorError.message : 'Error desconocido';
      return NextResponse.json(
        { error: `Error guardando embeddings: ${errorMessage}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'PDF subido y procesado exitosamente',
      fileName: `${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}-${file.name.replace('.pdf', '')}`,
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