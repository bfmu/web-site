// migrar-posts.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const POSTS_DIR = path.join(__dirname, 'frontend/src/content/posts');
const API_URL = 'http://localhost:82/api/blog'; // Cambia el puerto si es necesario

function getAllMarkdownFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  });
  return results;
}

function calculateReadingTime(text) {
  const wordsPerMinute = 200;
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}

async function migrate() {
  const files = getAllMarkdownFiles(POSTS_DIR);
  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8');
    const { data, content } = matter(raw);
    const slug = path.basename(file, '.md');
    const readingTime = calculateReadingTime(content);
    const post = {
      slug,
      title: data.title || slug,
      content,
      description: data.description || '',
      image: data.image || '',
      tags: data.tags || [],
      category: data.category || '',
      draft: data.draft || false,
      published: data.published || new Date().toISOString(),
      language: data.language || 'es',
      readingTime
    };
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      if (res.ok) {
        console.log(`✅ Migrado: ${slug}`);
      } else {
        console.error(`❌ Error migrando ${slug}:`, await res.text());
      }
    } catch (err) {
      console.error(`❌ Error migrando ${slug}:`, err.message);
    }
  }
}

migrate(); 