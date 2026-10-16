require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const Brevo = require('@getbrevo/brevo');
const axios = require('axios');
const Contact = require('./models/Contact');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://bati-connect-sg6p.onrender.com',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Autorise Postman et les appels serveur sans en-tête Origin
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origine non autorisée par CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(bodyParser.json({ limit: '20kb' }));

/*
 * Connexion MongoDB
 */
mongoose
  .connect('mongodb+srv://ayoubzekhnine96:CwTQ21a8wUgoTLSp@clustersawti.wqsgj.mongodb.net/baticonnect')
  .then(() => console.log('✅ MongoDB connecté'))
  .catch((error) => {
    console.error('❌ Erreur MongoDB :', error.message);
  });

/*
 * Configuration Brevo
 */

/*
const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);
*/

/*
 * Protège les emails HTML contre l’injection de balises.
 */
function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/*
 * Envoi d’un email avec Brevo
 */
async function sendEmail(to, subject, htmlContent) {
  const emailData = {
    to: [{ email: to }],
    sender: {
      name: process.env.SENDER_NAME,
      email: process.env.SENDER_EMAIL,
    },
    subject,
    htmlContent,
  };

  try {
    const response = await apiInstance.sendTransacEmail(emailData);
    console.log(`✅ Email envoyé à ${to}`);
    return response;
  } catch (error) {
    console.error(
      `❌ Erreur email vers ${to} :`,
      error.response?.text || error.message
    );

    throw error;
  }
}

/*
 * Envoi du prospect vers Google Sheets
 */
async function sendToGoogleSheet(data) {
  if (!process.env.GOOGLE_SHEET_WEBHOOK_URL) {
    console.log('⚠️ URL Google Sheets non configurée');
    return;
  }

  try {
    await axios.post(process.env.GOOGLE_SHEET_WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ Prospect ajouté dans Google Sheets');
  } catch (error) {
    console.error(
      '❌ Erreur Google Sheets :',
      error.response?.data || error.message
    );

    throw error;
  }
}

/*
 * Route permettant de vérifier le serveur
 */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Le serveur fonctionne correctement.',
  });
});

/*
 * Enregistrement d’une demande de devis
 */
app.post('/api/contact', async (req, res) => {
     console.log('\n================================');
  try {
    const {
      fullName,
      phone,
      email,
      location,
      clientType,
      projectType,
      buildingType,
      budget,
      description,
    } = req.body;

     console.log('BODY REÇU :', req.body);
    if (
      !fullName ||
      !phone ||
      !email ||
      !location ||
      !clientType ||
      !projectType ||
      !buildingType ||
      !budget ||
      !description
    ) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez remplir tous les champs obligatoires.',
      });
    }

    /*
     * Enregistrement MongoDB
     */
    const newContact = new Contact({
      fullName,
      phone,
      email,
      location,
      clientType,
      projectType,
      buildingType,
      budget,
      description,
    });

    await newContact.save();

    console.log(`✅ Prospect enregistré : ${newContact._id}`);

    /*
     * Nettoyage des données avant insertion dans les emails HTML
     */
    const safeFullName = escapeHtml(fullName);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeLocation = escapeHtml(location);
    const safeClientType = escapeHtml(clientType);
    const safeProjectType = escapeHtml(projectType);
    const safeBuildingType = escapeHtml(buildingType);
    const safeBudget = escapeHtml(budget);
    const safeDescription = escapeHtml(description).replaceAll(
      '\n',
      '<br>'
    );

    /*
     * Email envoyé au prospect
     */
    const htmlProspect = `
      <div
        style="
          max-width: 650px;
          margin: 0 auto;
          padding: 30px;
          font-family: Arial, sans-serif;
          color: #1f2937;
          line-height: 1.6;
        "
      >
        <h2 style="color: #0f2942;">
          Bonjour ${safeFullName},
        </h2>

        <p>
          Merci de nous avoir contactés concernant votre projet de
          <strong>${safeProjectType.toLowerCase()}</strong>.
        </p>

        <p>
          Nous avons bien reçu votre demande d’étude gratuite.
          Un membre de notre équipe vous contactera rapidement afin
          d’échanger sur votre chantier et vos besoins.
        </p>

        <div
          style="
            background: #f3f4f6;
            border-left: 4px solid #f97316;
            padding: 15px;
            margin: 25px 0;
          "
        >
          <p style="margin: 0 0 8px;">
            <strong>Projet :</strong> ${safeProjectType}
          </p>

          <p style="margin: 0 0 8px;">
            <strong>Bâtiment :</strong> ${safeBuildingType}
          </p>

          <p style="margin: 0 0 8px;">
            <strong>Localisation :</strong> ${safeLocation}
          </p>

          <p style="margin: 0;">
            <strong>Budget :</strong> ${safeBudget}
          </p>
        </div>

        <p>À très bientôt,</p>

        <p>
          <strong>L’équipe ${escapeHtml(process.env.SENDER_NAME)}</strong>
        </p>
      </div>
    `;

    /*
     * Email envoyé à l’administrateur
     */
    const htmlAdmin = `
      <div
        style="
          max-width: 700px;
          margin: 0 auto;
          padding: 30px;
          font-family: Arial, sans-serif;
          color: #1f2937;
          line-height: 1.6;
        "
      >
        <h2 style="color: #f97316;">
          🔥 Nouvelle demande de devis
        </h2>

        <table
          style="
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          "
        >
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Nom</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeFullName}
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Téléphone</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <a href="tel:${safePhone}">${safePhone}</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Email</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <a href="mailto:${safeEmail}">${safeEmail}</a>
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Ville et pays</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeLocation}
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Type de client</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeClientType}
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Type de projet</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeProjectType}
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Type de bâtiment</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeBuildingType}
            </td>
          </tr>

          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              <strong>Budget</strong>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd;">
              ${safeBudget}
            </td>
          </tr>
        </table>

        <div
          style="
            margin-top: 20px;
            padding: 15px;
            background: #f3f4f6;
            border-radius: 8px;
          "
        >
          <strong>Description du projet :</strong>

          <p style="margin-bottom: 0;">
            ${safeDescription}
          </p>
        </div>
      </div>
    `;

    /*
     * Google Sheets et emails
     *
     * allSettled évite de répondre "erreur" au prospect lorsque
     * MongoDB a réussi, mais qu’un email ou Google Sheets a échoué.
     */
    /*
    const externalServices = await Promise.allSettled([
      sendToGoogleSheet({
        fullName,
        phone,
        email,
        location,
        clientType,
        projectType,
        buildingType,
        budget,
        description,
        status: 'Nouveau',
        createdAt: new Date().toLocaleString('fr-FR', {
          timeZone: 'Africa/Abidjan',
        }),
      }),

      sendEmail(
        email,
        'Votre demande de devis a bien été reçue',
        htmlProspect
      ),

      sendEmail(
        process.env.ADMIN_EMAIL,
        `🔥 Nouvelle demande de devis : ${fullName}`,
        htmlAdmin
      ),
    ]);

    externalServices.forEach((result, index) => {
      if (result.status === 'rejected') {
        const services = [
          'Google Sheets',
          'email prospect',
          'email administrateur',
        ];

        console.error(`❌ Échec ${services[index]} :`, result.reason);
      }
    });

    */

    return res.status(201).json({
      success: true,
      message: 'Votre demande a bien été enregistrée 🚀',
      contactId: newContact._id,
    });
  } catch (error) {
    console.error('❌ Erreur serveur :', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.fromEntries(
        Object.entries(error.errors).map(([field, value]) => [
          field,
          value.message,
        ])
      );

      return res.status(400).json({
        success: false,
        message: 'Certaines informations ne sont pas valides.',
        errors: validationErrors,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Erreur serveur pendant l’envoi de votre demande.',
    });
  }
});

/*
 * Gestion des routes inexistantes
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route introuvable.',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});