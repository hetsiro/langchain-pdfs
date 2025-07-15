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
    
    Tu tarea es analizar una oferta laboral específica y BUSCAR CANDIDATOS REALES que se ajusten a los requisitos del puesto.
    
    OFERTA LABORAL:
    ${jobOffer}
    
    CVs DE CANDIDATOS DISPONIBLES:
    ${context}
    
    REGLAS DE EVALUACIÓN:
    
    1. ANÁLISIS DE LA OFERTA LABORAL:
       - Identifica los requisitos técnicos específicos
       - Identifica los requisitos de experiencia
       - Identifica las responsabilidades del puesto
       - Identifica las tecnologías y herramientas requeridas
       - Identifica el nivel de seniority buscado
    
    2. BÚSQUEDA DE CANDIDATOS:
       - Busca candidatos que tengan experiencia en las tecnologías/habilidades requeridas
       - Considera experiencia relacionada o similar
       - Evalúa el nivel de experiencia disponible
       - Prioriza candidatos que cumplan con la mayoría de requisitos
    
    3. CRITERIOS DE SELECCIÓN:
       - Busca candidatos con experiencia en las tecnologías específicas mencionadas
       - Evalúa el nivel de seniority requerido (puede ser flexible)
       - Considera proyectos relevantes para el puesto
       - Analiza la trayectoria profesional
       - Si solo hay un candidato disponible, evalúalo aunque no cumpla completamente
    
    4. EVALUACIÓN DE CANDIDATOS:
       - Analiza cada CV en detalle
       - Identifica habilidades técnicas específicas mencionadas
       - Busca experiencia en tecnologías relacionadas o similares
       - Compara con los requisitos de manera flexible
       - Si hay información relevante, úsala
       - Si solo hay un candidato, inclúyelo en el análisis con sus limitaciones
    
    5. PROTECCIÓN DE DATOS SENSIBLES (OBLIGATORIO):
       - PUEDES mencionar nombres de candidatos para identificarlos
       - NUNCA menciones direcciones físicas, ciudades específicas, países, calles, números de casa
       - NUNCA incluyas números de teléfono, celulares, correos electrónicos, LinkedIn, GitHub
       - NUNCA reveles información de redes sociales (Twitter, Instagram, Facebook, etc.)
       - NUNCA menciones DNI, pasaporte, números de identificación, números de cuenta
       - NUNCA incluyas fechas de nacimiento, edad específica
       - NUNCA menciones información de contacto personal
       - Reemplaza ubicaciones con "Ubicación disponible", "Ciudad disponible"
       - Reemplaza redes sociales con "Perfil profesional disponible"
       - Reemplaza información de contacto con "Información de contacto disponible"
       - Reemplaza números de celular con "Información de contacto disponible"
    
    6. ESTRUCTURA DE RESPUESTA:
       - SELECCIONA SOLO EL MEJOR CANDIDATO
       - Incluye el nombre completo del candidato
       - Muestra toda la información del CV (sin datos sensibles)
       - Estructura: Nombre, Resumen, Experiencia, Educación, Habilidades, Proyectos
       - Formato profesional y legible
       - Incluye análisis de compatibilidad con la oferta
    
    7. FORMATO DE RESPUESTA:
       - Muestra SOLO el mejor candidato encontrado
       - Incluye toda la información relevante del CV
       - Formato estructurado y profesional
       - Sin información sensible (contacto, ubicación, redes sociales)
       - Información completa pero protegida
       - Análisis de qué tan bien se ajusta a la oferta
       - Si no cumple completamente, menciona las limitaciones
    
    SELECCIONA EL MEJOR CANDIDATO y muestra su CV completo con análisis de compatibilidad:
    
    FORMATO DE RESPUESTA:
    
    NOMBRE DEL CANDIDATO
    
    ANÁLISIS DE COMPATIBILIDAD CON LA OFERTA
    - Qué tan bien se ajusta a los requisitos
    - Fortalezas principales
    - Limitaciones o áreas de mejora (si las hay)
    - Recomendación final
    
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
    const analysisMatch = generatedCV.match(/ANÁLISIS DE COMPATIBILIDAD CON LA OFERTA[\s\S]*?(?=CV COMPLETO|$)/i);
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