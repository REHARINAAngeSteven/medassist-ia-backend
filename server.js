// server.js
require('dotenv').config(); // Charge les variables d'environnement du fichier .env

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra'); // Pour la gestion du dossier 'uploads'
const cors = require('cors');

// Importe les services d'IA
const { transcribeAudio } = require('./services/speechService'); // Utilise OpenAI Whisper
const { analyzeSymptomsWithGemini, analyzeImageWithGemini } = require('./services/geminiService'); // Utilise Google Gemini

const app = express();
const port = process.env.PORT || 3000; // Définit le port du serveur
const uploadDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads'); // Dossier pour les uploads
const os = require('os');
app.use(cors());

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const PORT = 3000;
app.listen(PORT, () => {
  const ip = getLocalIP();
  console.log(`Serveur démarré sur http://${ip}:${PORT}`);
  console.log(`URL API disponible : http://${ip}:${PORT}/api`);
});

// --- Middlewares Express ---
// Pour parser le corps des requêtes JSON
app.use(express.json());
// Pour parser les données URL encodées
app.use(express.urlencoded({ extended: true }));

// --- Configuration de Multer pour l'upload de fichiers ---
// S'assure que le dossier 'uploads' existe
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Les fichiers seront stockés dans le dossier 'uploads'
    },
    filename: function (req, file, cb) {
        // Donne un nom unique au fichier avec un timestamp pour éviter les collisions
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Routes de l'API ---

// Route de base pour vérifier que le serveur est fonctionnel
app.get('/', (req, res) => {
    res.send('Bienvenue sur le backend d\'assistance médicale IA! Prêt à recevoir vos requêtes.');
});

/**
 * Route POST pour l'analyse des symptômes par texte.
 * Reçoit un JSON avec `symptomText`.
 */
app.post('/api/analyze/text', async (req, res) => {
    const { symptomText } = req.body;
    if (!symptomText) {
        return res.status(400).json({ status: 'error', message: 'Le champ "symptomText" est requis.' });
    }

    try {
        const medicalAdvice = await analyzeSymptomsWithGemini(symptomText);
        res.json({
            status: 'success',
            message: "Analyse des symptômes par texte terminée.",
            interpretation: medicalAdvice,
            disclaimer: "Cette analyse est fournie à titre informatif et ne remplace pas un diagnostic ou un conseil médical professionnel. Consultez toujours un professionnel de la santé."
        });
    } catch (error) {
        console.error('Erreur dans la route /api/analyze/text:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || "Une erreur interne est survenue lors de l'analyse du texte."
        });
    }
});

/**
 * Route POST pour l'analyse des symptômes par voix.
 * Nécessite un fichier audio uploadé via form-data sous le nom 'audioFile'.
 */
app.post('/api/analyze/audio', upload.single('audioFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Aucun fichier audio n\'a été téléchargé. Le champ attendu est "audioFile".' });
    }

    const audioFilePath = req.file.path; // Chemin du fichier temporaire

    try {
        const transcription = await transcribeAudio(audioFilePath); // Transcrit la voix en texte avec Whisper
        const medicalAdvice = await analyzeSymptomsWithGemini(transcription); // Analyse le texte transcrit avec Gemini

        res.json({
            status: 'success',
            message: "Analyse des symptômes par voix terminée.",
            transcription: transcription,
            interpretation: medicalAdvice,
            disclaimer: "Cette analyse est fournie à titre informatif et ne remplace pas un diagnostic ou un conseil médical professionnel. Consultez toujours un professionnel de la santé."
        });
    } catch (error) {
        console.error('Erreur dans la route /api/analyze/audio:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || "Une erreur interne est survenue lors de l'analyse audio."
        });
    }
});

/**
 * Route POST pour l'analyse des symptômes par image.
 * Nécessite un fichier image uploadé via form-data sous le nom 'imageFile'.
 */
app.post('/api/analyze/image', upload.single('imageFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'Aucun fichier image n\'a été téléchargé. Le champ attendu est "imageFile".' });
    }

    const imagePath = req.file.path; // Chemin du fichier temporaire

    try {
        const medicalObservations = await analyzeImageWithGemini(imagePath); // Analyse l'image avec Gemini Vision

        res.json({
            status: 'success',
            message: "Analyse des observations visuelles terminée.",
            observations: medicalObservations,
            disclaimer: "Cette analyse est fournie à titre informatif, décrit uniquement les observations visuelles et ne remplace pas un diagnostic ou un conseil médical professionnel. Consultez toujours un professionnel de la santé."
        });
    } catch (error) {
        console.error('Erreur dans la route /api/analyze/image:', error);
        res.status(500).json({
            status: 'error',
            message: error.message || "Une erreur interne est survenue lors de l'analyse d'image."
        });
    }
});

// --- Gestion des erreurs ---
// Middleware pour gérer les routes non trouvées (404)
app.use((req, res, next) => {
    res.status(404).json({ status: 'error', message: 'Route non trouvée. Vérifiez l\'URL et la méthode HTTP.' });
});

// Middleware de gestion des erreurs global (500)
app.use((err, req, res, next) => {
    console.error('Erreur serveur non gérée:', err.stack);
    res.status(500).json({ status: 'error', message: 'Une erreur interne du serveur est survenue.' });
});

// --- Démarrer le serveur ---
app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
    console.log('Assurez-vous que vos variables d\'environnement GEMINI_API_KEY et OPENAI_API_KEY sont correctement configurées dans le fichier .env.');
    console.log(`Les fichiers uploadés seront stockés temporairement dans le dossier: ${uploadDir}`);
});