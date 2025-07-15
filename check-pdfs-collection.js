import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '.env.local') });

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

async function checkPdfsCollection() {
  try {
    console.log('🔍 Verificando colección "pdfs"...');
    
    // Verificar si la colección existe
    const collectionResponse = await fetch(`${QDRANT_URL}/collections/pdfs`, {
      headers: {
        'api-key': QDRANT_API_KEY
      }
    });

    if (collectionResponse.ok) {
      const collectionData = await collectionResponse.json();
      console.log('✅ Colección "pdfs" existe');
      console.log('Puntos en la colección:', collectionData.result.points_count);
      
      // Obtener algunos puntos para verificar los datos
      const scrollResponse = await fetch(`${QDRANT_URL}/collections/pdfs/points/scroll?limit=10&with_payload=true&with_vector=false`, {
        method: 'POST',
        headers: {
          'api-key': QDRANT_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (scrollResponse.ok) {
        const scrollData = await scrollResponse.json();
        console.log('📊 Datos encontrados:');
        console.log('Total de puntos obtenidos:', scrollData.result.points.length);
        
        // Mostrar información de los primeros puntos
        scrollData.result.points.forEach((point, index) => {
          console.log(`\n--- Punto ${index + 1} ---`);
          console.log('ID:', point.id);
          console.log('Payload:', JSON.stringify(point.payload, null, 2));
        });
        
        // Agrupar por pdfId
        const pdfs = {};
        scrollData.result.points.forEach(point => {
          if (point.payload && point.payload.pdfId) {
            const pdfId = point.payload.pdfId;
            const fileName = point.payload.fileName || 'Sin nombre';
            
            if (!pdfs[pdfId]) {
              pdfs[pdfId] = {
                name: fileName,
                pdfId,
                fragments: 0
              };
            }
            pdfs[pdfId].fragments++;
          }
        });
        
        console.log('\n📋 CVs únicos encontrados:');
        Object.values(pdfs).forEach(cv => {
          console.log(`- ${cv.name} (ID: ${cv.pdfId}) - ${cv.fragments} fragmentos`);
        });
        
      } else {
        console.log('❌ Error obteniendo puntos:', scrollResponse.status);
        const errorText = await scrollResponse.text();
        console.log('Error details:', errorText);
      }
      
    } else {
      console.log('❌ Colección "pdfs" no existe');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkPdfsCollection(); 