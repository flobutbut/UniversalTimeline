import express from 'express';
import cors from 'cors';
import databaseRouter from './api/database.js';

console.log('Démarrage du serveur...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/database', databaseRouter);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Gestion des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur non gérée:', err);
  if (err instanceof Error) {
    console.error(`Message d'erreur: ${err.message}`);
    console.error(`Stack trace: ${err.stack}`);
  }
  res.status(500).json({
    error: err.message || 'Une erreur interne est survenue'
  });
});

// Gestion des promesses non gérées
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse non gérée rejetée:', reason);
  if (reason instanceof Error) {
    console.error(`Message d'erreur: ${reason.message}`);
    console.error(`Stack trace: ${reason.stack}`);
  }
  // Ne pas arrêter le processus, mais logger l'erreur
});

process.on('uncaughtException', (error) => {
  console.error('Exception non gérée:', error);
  if (error instanceof Error) {
    console.error(`Message d'erreur: ${error.message}`);
    console.error(`Stack trace: ${error.stack}`);
  }
  // Ne pas arrêter le processus, mais logger l'erreur
});

// Démarrage du serveur avec gestion des erreurs
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`Serveur API démarré sur le port ${PORT}`);
    });

    // Gestion de l'arrêt gracieux
    process.on('SIGTERM', () => {
      console.log('SIGTERM reçu. Arrêt gracieux du serveur...');
      server.close(() => {
        console.log('Serveur arrêté.');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error);
    if (error instanceof Error) {
      console.error(`Message d'erreur: ${error.message}`);
      console.error(`Stack trace: ${error.stack}`);
    }
    process.exit(1);
  }
};

// Démarrer le serveur
startServer().catch(error => {
  console.error('Erreur fatale lors du démarrage du serveur:', error);
  process.exit(1);
}); 