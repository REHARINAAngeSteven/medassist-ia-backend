// services/speechService.js
const OpenAI = require('openai');
const fs = require('fs-extra'); // Pour la gestion des fichiers

// Initialise le client OpenAI avec la clé API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcrit un fichier audio en texte à l'aide de l'API OpenAI Whisper.
 * @param {string} audioFilePath - Le chemin du fichier audio à transcrire.
 * @returns {Promise<string>} La transcription du texte.
 */
async function transcribeAudio(audioFilePath) {
    try {
        console.log(`[Whisper] Tentative de transcription de: ${audioFilePath}`);

        // L'API Whisper attend un ReadStream du fichier
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(audioFilePath), // Crée un flux de lecture pour le fichier
            model: "whisper-1",                       // Modèle de transcription vocale d'OpenAI
            language: "fr",                           // Spécifie la langue pour une meilleure précision
        });

        console.log(`[Whisper] Transcription réussie: "${transcription.text.substring(0, 100)}..."`);
        return transcription.text;
    } catch (error) {
        console.error('[Whisper] Erreur lors de la transcription audio:', error.message);
        if (error.response) {
            console.error('[Whisper] Réponse d\'erreur OpenAI:', error.response.data);
        }
        throw new Error("Échec de la transcription audio via OpenAI Whisper. Vérifiez votre clé API, le format du fichier audio et les limites d'utilisation.");
    } finally {
        // Supprime le fichier temporaire après traitement
        // La gestion de la suppression est dans le service pour s'assurer qu'elle est toujours exécutée
        await fs.remove(audioFilePath).catch(err => {
            console.error(`[FS] Erreur lors de la suppression du fichier audio temporaire ${audioFilePath}:`, err);
        });
    }
}

module.exports = { transcribeAudio };