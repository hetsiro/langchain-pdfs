import { NextRequest, NextResponse } from 'next/server';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';



// Configura el cliente de Qdrant usando variables de entorno
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!, // Usa tu endpoint de Qdrant
  apiKey: process.env.QDRANT_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question) {
      return NextResponse.json(
        { error: 'Se requiere pregunta' },
        { status: 400 }
      );
    }

    // Configura el vector store para buscar en Qdrant
    const embeddings = new OllamaEmbeddings({
      model: 'nomic-embed-text',
      baseUrl: 'http://localhost:11434',
    });

    const vectorStore = new QdrantVectorStore(embeddings, {
      client: qdrant,
      collectionName: 'pdfs',
    });

    // Buscar documentos similares en todos los CVs
    const similarDocs = await vectorStore.similaritySearch(question, 5);

    const context = similarDocs.map(doc => doc.pageContent).join('\n\n');

    // Configurar el modelo de Ollama para chat
    const model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'gemma3',
      temperature: 0.7,
    });

    const prompt = `
    Eres un asistente especializado en evaluación de candidatos y recursos humanos.
    
    Basándote en el siguiente contexto de CVs de candidatos, responde la pregunta de manera clara y precisa.
    Si la información no está en el contexto, indícalo claramente.
    
    IMPORTANTE: 
    - Identifica a qué candidato pertenece cada información
    - Compara candidatos cuando sea relevante
    - Proporciona recomendaciones basadas en la experiencia y habilidades
    - Sé específico sobre las fortalezas de cada candidato

    Contexto de los CVs:
    ${context}

    Pregunta: ${question}

    Respuesta:`;

    const response = await model.invoke(prompt);

    return NextResponse.json({
      answer: response
    });
  } catch (error) {
    console.error('Error procesando pregunta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 