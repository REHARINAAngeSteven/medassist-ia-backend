// services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra'); // Pour la lecture du fichier image

// Initialise le client Google Generative AI avec la clé API Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Analyse les symptômes textuels avec Google Gemini.
 * @param {string} symptomText - Le texte des symptômes décrit par l'utilisateur.
 * @returns {Promise<string>} L'interprétation de Gemini.
 */
async function analyzeSymptomsWithGemini(symptomText) {
    try {
        // Utilise le modèle gemini-pro pour les requêtes textuelles
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Définition du prompt pour guider le comportement de l'IA. C'est crucial pour l'aspect médical.
        const prompt = `Vous êtes un assistant médical utile et éducatif. Votre rôle est d'analyser les symptômes décrits par l'utilisateur et de fournir des informations générales, des conseils de bon sens, ou de suggérer des questions supplémentaires.

        Règles IMPÉRATIVES:
        1. Ne donnez JAMAIS de diagnostic médical direct.
        2. Ne remplacez JAMAIS un avis médical professionnel.
        3. Conseillez TOUJOURS de consulter un médecin ou un professionnel de la santé pour un diagnostic précis et un traitement approprié.
        4. Concentrez-vous sur des informations éducatives et sur les prochaines étapes possibles (repos, hydratation, quand consulter).
        5. La réponse doit être concise, claire et facile à comprendre.

        Voici les symptômes décrits par une personne : "${symptomText}".
        Que pouvez-vous en dire en respectant les règles ci-dessus ?`;

        console.log(`[Gemini-Text] Requête d'analyse de texte reçue: "${symptomText.substring(0, 100)}..."`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(`[Gemini-Text] Analyse réussie.`);
        return response.text();
    } catch (error) {
        console.error('[Gemini-Text] Erreur lors de l\'appel à l\'API Gemini (texte):', error.message);
        throw new Error("Échec de l'analyse des symptômes via Gemini. Vérifiez votre clé API et la connectivité.");
    }
}

/**
 * Analyse une image avec Google Gemini Vision.
 * @param {string} imagePath - Le chemin du fichier image à analyser.
 * @returns {Promise<string>} L'interprétation de Gemini concernant l'image.
 */
async function analyzeImageWithGemini(imagePath) {
    try {
        // Utilise le modèle gemini-pro-vision pour l'analyse d'image
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        // Lit le fichier image en tant que Buffer
        const imageData = fs.readFileSync(imagePath);
        const imageParts = [
            {
                inlineData: {
                    data: Buffer.from(imageData).toString('base64'),
                    // Détecte ou définit le bon type MIME de l'image (très important !)
                    mimeType: `image/${imagePath.split('.').pop()}`, // Ex: 'image/jpeg', 'image/png'
                },
            },
        ];

        // Prompt spécifique pour l'analyse d'image médicale (sans diagnostic)
        const prompt = `Décrivez ce que vous voyez sur cette image en relation avec des observations potentielles de santé (par exemple, éruption cutanée, rougeur, gonflement, blessure, décoloration).
        
        Règles IMPÉRATIVES:
        1. Ne faites JAMAIS de diagnostic médical.
        2. Ne remplacez JAMAIS un avis médical professionnel.
        3. Indiquez TOUJOURS que l'image ne permet pas de diagnostic et qu'un examen par un professionnel de la santé est nécessaire pour toute conclusion clinique.
        4. Décrivez uniquement les observations visuelles, sans interprétation médicale directe.
        5. La réponse doit être concise, claire et facile à comprendre.

        Observations :`;

        console.log(`[Gemini-Vision] Tentative d'analyse d'image de: ${imagePath}`);
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        console.log(`[Gemini-Vision] Analyse d'image réussie.`);
        return response.text();
    } catch (error) {
        console.error('[Gemini-Vision] Erreur lors de l\'appel à l\'API Gemini Vision:', error.message);
        throw new Error("Échec de l'analyse d'image via Gemini Vision. Vérifiez votre clé API, le format/type MIME de l'image et la qualité de l'image.");
    } finally {
        // Supprime le fichier temporaire après traitement
        await fs.remove(imagePath).catch(err => {
            console.error(`[FS] Erreur lors de la suppression du fichier image temporaire ${imagePath}:`, err);
        });
    }
}

module.exports = { analyzeSymptomsWithGemini, analyzeImageWithGemini };