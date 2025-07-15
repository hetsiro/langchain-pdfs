// Script para verificar el contenido del vector store
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});



async function checkVectorStore() {
  try {
    console.log('🔍 Verificando vector store...');
    
    // Verificar colección
    const collection = await qdrant.getCollection('pdfs');
    console.log('📊 Información de la colección:', {
      name: collection.name,
      vectors_count: collection.vectors_count,
      points_count: collection.points_count
    });

    // Buscar todos los puntos
    const searchResult = await qdrant.scroll('pdfs', {
      limit: 100,
      with_payload: true,
      with_vector: false
    });

    console.log('📄 Documentos encontrados:', searchResult.points.length);
    
    // Agrupar por pdfId
    const pdfs = {};
    searchResult.points.forEach(point => {
      const pdfId = point.payload.pdfId;
      const fileName = point.payload.fileName;
      
      if (!pdfs[pdfId]) {
        pdfs[pdfId] = {
          fileName,
          pdfId,
          fragments: 0
        };
      }
      pdfs[pdfId].fragments++;
    });

    console.log('📋 CVs únicos encontrados:');
    Object.values(pdfs).forEach(pdf => {
      console.log(`  - ${pdf.fileName} (${pdf.fragments} fragmentos)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVectorStore(); 