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
    const { jobOffer } = await request.json();

    if (!jobOffer) {
      return NextResponse.json(
        { error: 'Se requiere la oferta laboral' },
        { status: 400 }
      );
    }

    // Configurar embeddings y vector store para buscar candidatos reales
    const embeddings = new OpenAIEmbeddings({
      model: 'text-embedding-3-small',
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const vectorStore = new QdrantVectorStore(embeddings, {
      client: qdrant,
      collectionName: 'pdfs',
    });

    // Buscar candidatos relevantes basados en la oferta laboral
    const similarDocs = await vectorStore.similaritySearch(jobOffer, 10);
    const context = similarDocs.map(doc => doc.pageContent).join('\n\n');

    // Configurar el modelo de OpenAI
    const model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    const prompt = `
    Eres un experto en recursos humanos y evaluación de candidatos.
    
    Tu tarea es analizar una oferta laboral específica y SELECCIONAR ÚNICAMENTE EL MEJOR CANDIDATO que se ajuste a los requisitos del puesto.
    
    OFERTA LABORAL:
    ${jobOffer}
    
    CVs DE CANDIDATOS DISPONIBLES:
    ${context}
    
    REGLAS DE EVALUACIÓN MUY ESTRICTAS:
    
  1. SELECCIÓN DEL MEJOR CANDIDATO:
       - SOLO selecciona UN candidato que sea el MEJOR ajuste
       - Si no hay un candidato que cumpla al menos el 60 porciento de los requisitos, indica NO SE ENCONTRÓ CANDIDATO ADECUADO
       - NO menciones múltiples candidatos
       - NO hagas comparaciones entre candidatos
       - Si hay empate, selecciona el que tenga más experiencia
    
   2 ANÁLISIS DE LA OFERTA LABORAL:
       - Identifica los requisitos técnicos específicos
       - Identifica los requisitos de experiencia
       - Identifica las responsabilidades del puesto
       - Identifica las tecnologías y herramientas requeridas
       - Identifica el nivel de seniority buscado
    
 3. CRITERIOS DE SELECCIÓN ESTRICTOS:
       - Busca candidatos con experiencia en las tecnologías específicas mencionadas
       - Evalúa el nivel de seniority requerido
       - Considera proyectos relevantes para el puesto
       - Analiza la trayectoria profesional
       - Prioriza candidatos que cumplan con la mayoría de requisitos
    
  4 PROTECCIÓN DE DATOS SENSIBLES (OBLIGATORIO):
       - PUEDES mencionar nombres de candidatos para identificarlos
       - NUNCA menciones direcciones físicas, ciudades específicas, países, calles, números de casa
       - NUNCA incluyas números de teléfono, celulares, correos electrónicos, LinkedIn, GitHub
       - NUNCA reveles información de redes sociales (Twitter, Instagram, Facebook, etc.)
       - NUNCA menciones DNI, pasaporte, números de identificación, números de cuenta
       - NUNCA incluyas fechas de nacimiento, edad específica
       - NUNCA menciones información de contacto personal
       - CENSURA ESPECÍFICAMENTE:
         * Direcciones chilenas como V Región, Quilpué, Valparaíso" → "Ubicación disponible"
         * Números que empiecen con +56 o tengan 9 dígitos → "Información de contacto disponible"
         * Cualquier dirección física → "Ubicación disponible"
         * Cualquier número de teléfono/celular → "Información de contacto disponible"
         * Cualquier email → "Información de contacto disponible"
         * Cualquier red social → "Perfil profesional disponible"
    
  5 ESTRUCTURA DE RESPUESTA:
       - SELECCIONA SOLO EL MEJOR CANDIDATO
       - Incluye el nombre completo del candidato
       - Muestra toda la información del CV (sin datos sensibles)
       - Estructura: Nombre, Resumen, Experiencia, Educación, Habilidades, Proyectos
       - Formato profesional y legible
       - Incluye análisis de compatibilidad con la oferta
    
   6. FORMATO DE RESPUESTA:
       - Muestra SOLO el mejor candidato encontrado
       - Incluye toda la información relevante del CV
       - Formato estructurado y profesional
       - Sin información sensible (contacto, ubicación, redes sociales)
       - Información completa pero protegida
       - Análisis de qué tan bien se ajusta a la oferta
       - Si no cumple completamente, menciona las limitaciones
    
    SELECCIONA EL MEJOR CANDIDATO y muestra su CV completo con análisis de compatibilidad:
    
    FORMATO DE RESPUESTA OBLIGATORIO:
    
    NOMBRE DEL CANDIDATO: [Nombre completo del candidato seleccionado]
    
    AJUSTE A LOS REQUISITOS:
    - Compatibilidad con los requisitos específicos
    
    CV COMPLETO DEL CANDIDATO
    - Información personal (sin datos sensibles)
    - Resumen profesional
    - Experiencia laboral
    - Educación
    - Habilidades técnicas
    - Proyectos destacados
    `;

    const response = await model.invoke(prompt);
    const generatedCV = response.content.toString();

    // Extraer el nombre del candidato del resultado
    const candidateNameMatch = generatedCV.match(/(?:nombre|candidato|perfil):\s*([A-Za-z\s]+)/i);
    const candidateName = candidateNameMatch ? candidateNameMatch[1].trim() : 'Candidato';

    // Extraer la sección de análisis del resultado
    const analysisMatch = generatedCV.match(/AJUSTE A LOS REQUISITOS[\s\S]*?(?=CV COMPLETO|$)/i);
    let analysis = analysisMatch ? analysisMatch[0].trim() : '';
    
    // Quitar los ** del análisis
    analysis = analysis.replace(/\*\*/g, '');

    return NextResponse.json({
      cv: generatedCV,
      candidateName: candidateName,
      analysis: analysis,
      message: 'Mejor candidato encontrado exitosamente'
    });

  } catch (error) {
    console.error('Error generando CV personalizado:', error);
    return NextResponse.json(
      { error: 'Error generando CV personalizado' },
      { status: 500 }
    );
  }
} 