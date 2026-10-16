const mongoose = require('mongoose');

const projectTypes = [
  'Construction',
  'Fondation',
  'Rénovation',
  'Architecture',
  'Extension',
  'Autre',
];

const buildingTypes = [
  'Maison',
  'Appartement',
  'Immeuble',
  'Commerce',
  'Bureau',
  'Autre',
];

const budgets = [
  'Moins de 6 500 000 FCFA',
  '6 500 000 – 16 500 000 FCFA',
  '16 500 000 – 33 000 000 FCFA',
  '33 000 000 – 65 500 000 FCFA',
  'Plus de 65 500 000 FCFA',
  'À définir ensemble',
];

const contactSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30,
  },

  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 150,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150,
  },

  clientType: {
    type: String,
    enum: ['Particulier', 'Entreprise'],
    required: true,
  },

  projectType: {
    type: String,
    enum: projectTypes,
    required: true,
  },

  buildingType: {
    type: String,
    enum: buildingTypes,
    required: true,
  },

  budget: {
    type: String,
    enum: budgets,
    required: true,
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000,
  },

  status: {
    type: String,
    enum: ['Nouveau', 'Contacté', 'Qualifié', 'Converti', 'Refusé'],
    default: 'Nouveau',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Contact', contactSchema);