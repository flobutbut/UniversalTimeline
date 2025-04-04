import { PrismaClient } from '@prisma/client';
import { getEventDateFromWikidata } from '../api/routes.js';

const prisma = new PrismaClient();

async function updateDatesInBatches() {
  try {
    // Récupérer tous les événements qui n'ont pas de date
    const events = await prisma.event.findMany({
      where: {
        date: null
      }
    });

    console.log(`[SCRIPT] ${events.length} événements sans date trouvés`);

    // Traiter les événements par lots de 5
    for (let i = 0; i < events.length; i += 5) {
      const batch = events.slice(i, i + 5);
      
      console.log(`\n[SCRIPT] Traitement du lot ${Math.floor(i/5) + 1}/${Math.ceil(events.length/5)}`);
      console.log('----------------------------------------');

      for (const event of batch) {
        console.log(`[SCRIPT] Traitement de l'événement: ${event.label}`);
        
        if (event.wikidataId) {
          const date = await getEventDateFromWikidata(event.wikidataId);
          
          if (date) {
            await prisma.event.update({
              where: { id: event.id },
              data: { date }
            });
            console.log(`[SCRIPT] ✓ Date mise à jour: ${date}`);
          } else {
            console.log(`[SCRIPT] ✗ Aucune date trouvée`);
          }
        } else {
          console.log(`[SCRIPT] ✗ Pas d'ID Wikidata`);
        }
      }

      // Demander confirmation pour le prochain lot
      if (i + 5 < events.length) {
        console.log('\n[SCRIPT] Voulez-vous continuer avec le prochain lot ? (o/n)');
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });

        await new Promise((resolve) => {
          readline.question('', (answer: string) => {
            readline.close();
            if (answer.toLowerCase() !== 'o') {
              console.log('[SCRIPT] Arrêt du script');
              process.exit(0);
            }
            resolve(null);
          });
        });
      }
    }

    console.log('\n[SCRIPT] Mise à jour terminée !');
  } catch (error) {
    console.error('[SCRIPT] Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Lancer le script
updateDatesInBatches(); 