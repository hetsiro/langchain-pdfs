import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';



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
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = new QdrantVectorStore(embeddings, {
      client: qdrant,
      collectionName: 'pdfs',
    });

    // Buscar documentos similares en todos los CVs
    const similarDocs = await vectorStore.similaritySearch(question, 5);

    const context = similarDocs.map(doc => doc.pageContent).join('\n\n');

    // Configurar el modelo de OpenAI para chat
    const model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    const prompt = `
    Eres un asistente especializado en evaluación de candidatos y recursos humanos.
    
    Basándote en el siguiente contexto de CVs de candidatos, responde la pregunta de manera clara y precisa.
    Si la información no está en el contexto, indícalo claramente.
    
    REGLAS IMPORTANTES:
    
    🎯 PRECISIÓN Y ESTRICTEZ:
    - Responde SOLO con información específica y relevante
    - Si preguntan por el MEJOR candidato, selecciona UNO solo
    - NO hagas comparaciones extensas entre candidatos
    - Sé directo y conciso en tus respuestas
    - NO uses ** para enfatizar texto
    
    🔒 PROTECCIÓN DE DATOS SENSIBLES (OBLIGATORIO):
    - PUEDES mencionar nombres de candidatos para identificarlos
    - NUNCA menciones direcciones físicas, ciudades específicas, países, calles, números de casa
    - NUNCA compartas números de teléfono, celulares, correos electrónicos, LinkedIn, GitHub
    - NUNCA reveles información de redes sociales (Twitter, Instagram, Facebook, etc.)
    - NUNCA menciones DNI, pasaporte, números de identificación, números de cuenta
    - NUNCA compartas fechas de nacimiento, edad específica
    - NUNCA menciones información de contacto personal
    - CENSURA ESPECÍFICAMENTE:
      * Direcciones chilenas como V Región, Quilpué, Valparaíso" → "Ubicación disponible"
      * Números que empiecen con +56 o tengan 9 dígitos → "Información de contacto disponible"
      * Cualquier dirección física → "Ubicación disponible"
      * Cualquier número de teléfono/celular → "Información de contacto disponible"
      * Cualquier email → "Información de contacto disponible"
      * Cualquier red social → "Perfil profesional disponible"
      * Si hay información sensible, OMÍTELA completamente o usa términos genéricos
    
    🎯 PRECISIÓN TÉCNICA:
    - Distingue claramente entre tecnologías similares:
      * Next.js (framework de React para SSR/SSG)
      * Node.js (runtime de JavaScript para backend)
      * React (librería de UI)
      * Express.js (framework web para Node.js)
      * TypeScript vs JavaScript
    - Sé específico sobre versiones y frameworks cuando sea relevante
    - No confundas tecnologías relacionadas pero diferentes
    - Menciona el nivel de experiencia específico (básico, intermedio, avanzado, experto)
    - Si preguntan por una tecnología específica, solo menciona candidatos que la usen explícitamente
    
    📊 EVALUACIÓN DE CANDIDATOS:
    - Identifica a qué candidato pertenece cada información usando sus nombres
    - Compara candidatos cuando sea relevante
    - Proporciona recomendaciones basadas en la experiencia y habilidades
    - Sé específico sobre las fortalezas de cada candidato
    - Menciona años de experiencia cuando esté disponible
    
    💡 FORMATO DE RESPUESTA:
    - Usa viñetas para organizar la información
    - Agrupa por candidato cuando sea apropiado
    - Sé conciso pero completo
    - Prioriza la información más relevante para la pregunta
    - SIEMPRE omite información sensible
    - NO uses ** para enfatizar texto
    - Usa lenguaje directo y profesional

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