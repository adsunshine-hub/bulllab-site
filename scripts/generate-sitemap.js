import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://bulllab.kr';
const pages = ['', 'pages/today-report.html', 'pages/coin.html', 'pages/stock.html', 'pages/board.html', 'pages/humor.html', 'pages/resources.html', 'pages/contact.html', 'pages/privacy.html', 'pages/terms.html', 'pages/apps.html', 'pages/starive-chat-video-guide.html'];
const index = JSON.parse(await fs.readFile(path.join(root, 'data/posts/index.json'), 'utf8'));
if (!Array.isArray(index.posts)) throw new Error('posts must be an array');
const urls = pages.map(p => `${base}/${p}`);
for (const post of index.posts) {
  if (typeof post.slug !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(post.slug)) throw new Error(`Invalid slug: ${post.slug}`);
  await fs.access(path.join(root, 'data/posts', `${post.slug}.md`));
  urls.push(`${base}/pages/post.html?slug=${encodeURIComponent(post.slug)}`);
}
if (new Set(urls).size !== urls.length) throw new Error('Duplicate URLs');
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => `  <url><loc>${url.replace(/&/g, '&amp;')}</loc></url>`).join('\n') + '\n</urlset>\n';
await fs.writeFile(path.join(root, 'sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs`);
