import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { requirements } = await request.json();

    if (!requirements) {
      return NextResponse.json(
        { error: 'Se requieren los requisitos del puesto' },
        { status: 400 }
      );
    }

    // Configurar embeddings y vector store
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = new QdrantVectorStore(embeddings, {
      client: qdrant,
      collectionName: 'pdfs',
    });

    // Buscar todos los documentos relevantes
    const similarDocs = await vectorStore.similaritySearch(requirements, 10);
    const context = similarDocs.map(doc => doc.pageContent).join('\n\n');

    // Configurar el modelo de OpenAI
    const model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    const prompt = `
    Eres un experto en recursos humanos y evaluación de candidatos.
    
    Basándote en el siguiente contexto de CVs de candidatos y los requisitos del puesto, genera un CV consolidado del mejor candidato.
    
    REQUISITOS DEL PUESTO:
    ${requirements}
    
    CVs DE CANDIDATOS DISPONIBLES:
    ${context}
    
    INSTRUCCIONES:
    1. Analiza todos los CVs disponibles
    2. Identifica al mejor candidato basándote en los requisitos
    3. Genera un CV profesional y completo con la información del mejor candidato
    4. Incluye: Información personal, experiencia laboral, educación, habilidades técnicas, proyectos destacados
    5. Organiza la información de manera clara y profesional
    6. Asegúrate de que el CV sea coherente y completo
    
    REGLAS IMPORTANTES:
    - NO inventes información que no esté en los CVs originales
    - Si falta información en algún área, indícalo claramente
    - Mantén un formato profesional y legible
    - Incluye solo información relevante para el puesto
    - OMITE COMPLETAMENTE la siguiente información sensible:
      * Emails (reemplaza con [EMAIL])
      * Números de teléfono (reemplaza con [TELÉFONO])
      * Direcciones físicas específicas (reemplaza con [CIUDAD, PAÍS])
      * Números de documento/DNI/pasaporte (reemplaza con [DOCUMENTO])
      * Direcciones IP
      * Cualquier información personal identificable
    - Protege la privacidad del candidato en todo momento
    - Si hay información sensible en el contexto, generalízala o omítela
    
    Genera el CV del mejor candidato omitiendo toda información sensible:
    `;

    const response = await model.invoke(prompt);
    const generatedCV = response.content;

    return NextResponse.json({
      cv: generatedCV,
      message: 'CV generado exitosamente'
    });

  } catch (error) {
    console.error('Error generando CV:', error);
    return NextResponse.json(
      { error: 'Error generando CV' },
      { status: 500 }
    );
  }
} 