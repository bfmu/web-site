// migrar-posts.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_URL = 'http://localhost:82/api/blog'; // Cambia el puerto si es necesario

function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

async function migrate() {
  // [ELIMINADO: Este script ya no es necesario. La migración de markdown a backend ya fue realizada.]
}

migrate();