import express from 'express';
import cors from 'cors';
import { testConnection } from './api/database.js';
import routes from './api/routes.js';

console.log('Démarrage du serveur...');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', routes);

// Route de test
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Gestion des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Une erreur est survenue sur le serveur' });
});

// Gestion des promesses non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse non gérée rejetée:', reason);
  if (reason instanceof Error) {
    console.error(`Message d'erreur: ${reason.message}`);
    console.error(`Stack trace: ${reason.stack}`);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Exception non gérée:', error);
  if (error instanceof Error) {
    console.error(`Message d'erreur: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
  }
});

// Démarrage du serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await testConnection();
    
    app.listen(port, () => {
      console.log(`Serveur démarré sur le port ${port}`);
    });
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer(); 