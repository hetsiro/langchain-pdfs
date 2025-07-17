import { NextRequest, NextResponse } from 'next/server';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from '@langchain/openai';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { candidateName, analysis } = await request.json();

    if (!candidateName) {
      return NextResponse.json(
        { error: 'Se requiere el nombre del candidato' },
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

    // Buscar el CV del candidato específico
    const similarDocs = await vectorStore.similaritySearch(candidateName, 5);
    
    if (similarDocs.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró el CV del candidato especificado' },
        { status: 404 }
      );
    }

    // Encontrar el documento que mejor coincida con el nombre del candidato
    const candidateCV = similarDocs.find(doc => 
      doc.pageContent.toLowerCase().includes(candidateName.toLowerCase())
    ) || similarDocs[0];

    // Formatear el CV para PDF
    const formattedCV = formatCVForPDF(candidateCV.pageContent);

    // Generar PDF con Puppeteer
    const pdfBuffer = await generatePDF(formattedCV, candidateName, analysis || '');

    // Devolver el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CV_${candidateName.replace(/\s+/g, '_')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: 'Error generando PDF' },
      { status: 500 }
    );
  }
}

function formatCVForPDF(cvContent: string): string {
  // Solo quitar los ** del análisis y dejar que la IA haga la censura
  let formattedCV = cvContent;
  formattedCV = formattedCV.replace(/\*\*/g, '');
  return formattedCV;
}

async function generatePDF(cvContent: string, candidateName: string, analysis: string): Promise<Buffer> {
  let browser;
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    const executablePath = await chromium.executablePath();
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  } else {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  try {
    const page = await browser.newPage();
    
    // Crear HTML con estilos profesionales mejorados
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>CV - ${candidateName}</title>
        <style>
          body {
            font-family: 'Arial', sans-serif;
            line-height: 1.5;
            color: #333;
            width: 100%;
            margin: 0;
            padding: 0;
            background-color: white;
            font-size: 13px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #2c3e50;
            font-size: 24px;
            margin: 0;
            font-weight: bold;
          }
          .analysis-section {
            background-color: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 5px;
          }
          .analysis-section h2 {
            color: #2c3e50;
            font-size: 16px;
            font-weight: bold;
            margin: 0 0 10px 0;
          }
          .analysis-content {
            font-size: 12px;
            line-height: 1.4;
            color: #555;
            text-align: justify;
            width: 100%;
            word-wrap: break-word;
            max-width: 100%;
            margin: 0;
            padding: 0;
            text-justify: inter-word;
          }
          .analysis-content p {
            margin: 0 0 2px 0;
            text-align: justify;
            width: 100%;
            word-wrap: break-word;
            max-width: 100%;
            text-justify: inter-word;
          }
          .analysis-content br {
            display: block;
            margin: 0 0 2px 0;
          }
          .analysis-content div {
            text-align: justify;
            width: 100%;
            word-wrap: break-word;
            max-width: 100%;
            text-justify: inter-word;
          }
          .section {
            margin-bottom: 18px;
          }
          .section h2 {
            color: #2c3e50;
            font-size: 16px;
            font-weight: bold;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
            margin-bottom: 12px;
          }
          .section h3 {
            color: #34495e;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .experience-item, .education-item, .skill-item {
            margin-bottom: 12px;
          }
          .company, .school {
            font-weight: bold;
            color: #2c3e50;
            font-size: 13px;
          }
          .date {
            color: #7f8c8d;
            font-style: italic;
            font-size: 12px;
          }
          .description {
            margin-top: 5px;
            text-align: justify;
            font-size: 12px;
          }
          .skills {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }
          .skill-tag {
            background-color: #3498db;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
          }
          .contact-info {
            background-color: #ecf0f1;
            padding: 12px;
            border-radius: 5px;
            margin-bottom: 18px;
            font-size: 12px;
          }
          .contact-info p {
            margin: 3px 0;
            color: #7f8c8d;
          }
          .content {
            font-size: 12px;
            line-height: 1.4;
            text-align: justify;
            width: 100%;
            word-wrap: break-word;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }
          .content p {
            margin: 8px 0;
            text-align: justify;
            width: 100%;
            word-wrap: break-word;
            max-width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${candidateName}</h1>
        </div>
        
        <div class="analysis-section">
          <h2>📊 ANÁLISIS DE COMPATIBILIDAD</h2>
          <div class="analysis-content">
            ${analysis ? analysis.replace(/\n/g, '<br>') : `
              <p><strong>Evaluación:</strong> Este candidato ha sido seleccionado como el mejor perfil disponible para la oferta laboral analizada.</p>
              <p><strong>Criterios evaluados:</strong> Experiencia técnica, habilidades requeridas, nivel de seniority y compatibilidad con los requisitos del puesto.</p>
              <p><strong>Fortalezas principales:</strong> Se identificaron las habilidades y experiencias más relevantes para el puesto solicitado.</p>
              <p><strong>Áreas de mejora:</strong> Se evaluaron las limitaciones o áreas donde el candidato podría necesitar desarrollo adicional.</p>
              <p><strong>Recomendación final:</strong> Se sugiere revisar detalladamente el CV completo para confirmar la idoneidad del candidato y considerar una entrevista para evaluar la compatibilidad cultural y de comunicación.</p>
              `}
              <h2 style="margin-top: 30px; margin-bottom: 15px;">📄 CV COMPLETO DEL CANDIDATO</h2>
              ${cvContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
          </div>

        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    
    // Generar PDF
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      printBackground: true
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
} 