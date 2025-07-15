import { NextRequest, NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';

export async function POST(request: NextRequest) {
  try {
    const { jobOffer } = await request.json();

    if (!jobOffer) {
      return NextResponse.json(
        { error: 'Se requiere la oferta laboral' },
        { status: 400 }
      );
    }

    // No necesitamos vector store para crear un perfil completamente nuevo

    // Configurar el modelo de OpenAI
    const model = new ChatOpenAI({
      model: 'gpt-4o-mini',
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.7,
    });

    const prompt = `
    Eres un experto en recursos humanos y creación de perfiles profesionales.
    
    Tu tarea es analizar una oferta laboral específica y CREAR UN CV COMPLETAMENTE NUEVO de un candidato ideal que se ajuste perfectamente a los requisitos del puesto.
    
    OFERTA LABORAL:
    ${jobOffer}
    
    REGLAS DE CREACIÓN:
    
    1. ANÁLISIS DE LA OFERTA LABORAL:
       - Identifica los requisitos técnicos específicos
       - Identifica los requisitos de experiencia
       - Identifica las responsabilidades del puesto
       - Identifica las tecnologías y herramientas requeridas
       - Identifica el nivel de seniority buscado
       - Identifica el tipo de empresa o industria
    
    2. CREACIÓN DE PERFIL IDEAL:
       - CREA un candidato completamente nuevo e inventado
       - El candidato debe ser el PERFIL IDEAL para la oferta
       - Debe tener exactamente la experiencia y habilidades requeridas
       - Debe tener un background profesional coherente y realista
       - Debe tener proyectos y logros que demuestren competencia
    
    3. CRITERIOS DE CREACIÓN:
       - El candidato debe cumplir TODOS los requisitos de la oferta
       - Debe tener experiencia en las tecnologías específicas mencionadas
       - Debe tener el nivel de seniority requerido
       - Debe tener proyectos relevantes para el puesto
       - Debe tener una trayectoria profesional lógica y creíble
    
    4. ESTRUCTURA DEL CV IDEAL:
       - Título profesional que coincida exactamente con el puesto
       - Resumen profesional enfocado en los requisitos específicos
       - Experiencia laboral relevante y detallada
       - Educación y certificaciones apropiadas para el nivel
       - Habilidades técnicas que coincidan exactamente con los requisitos
       - Proyectos destacados relacionados con el puesto
       - Logros y métricas relevantes
       - Formato profesional y atractivo
    
    5. PROTECCIÓN DE DATOS SENSIBLES (OBLIGATORIO):
       - NUNCA incluyas nombres completos, nombres de pila, apellidos
       - NUNCA menciones direcciones físicas, ciudades específicas, países
       - NUNCA incluyas números de teléfono, correos electrónicos, LinkedIn, GitHub
       - NUNCA reveles información de redes sociales (Twitter, Instagram, Facebook, etc.)
       - NUNCA menciones DNI, pasaporte, números de identificación, números de cuenta
       - NUNCA incluyas fechas de nacimiento, edad específica
       - NUNCA menciones información de contacto personal
       - Usa términos genéricos: "Desarrollador", "Profesional", "Candidato"
       - Para ubicación usa: "Ubicación disponible", "Ciudad disponible"
       - Para contacto usa: "Información de contacto disponible"
       - Para redes sociales usa: "Perfil profesional disponible"
    
    6. PERSONALIZACIÓN Y REALISMO:
       - Crea un perfil que sea REALISTO y CREÍBLE
       - Incluye detalles específicos pero sin información sensible
       - Menciona empresas y proyectos ficticios pero realistas
       - Incluye métricas y logros cuantificables
       - Asegúrate de que la experiencia sea coherente con el nivel requerido
    
    7. ENFOQUE EN LA OFERTA:
       - El CV debe estar 100% alineado con la oferta laboral
       - Debe demostrar que el candidato puede cumplir todas las responsabilidades
       - Debe mostrar experiencia en las tecnologías específicas requeridas
       - Debe tener el nivel de experiencia apropiado para el puesto
    
    CREA un CV completamente nuevo de un candidato ideal para esta oferta laboral:
    `;

    const response = await model.invoke(prompt);
    const generatedCV = response.content;

    return NextResponse.json({
      cv: generatedCV,
      message: 'CV personalizado generado exitosamente'
    });

  } catch (error) {
    console.error('Error generando CV personalizado:', error);
    return NextResponse.json(
      { error: 'Error generando CV personalizado' },
      { status: 500 }
    );
  }
} 