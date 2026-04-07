import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import axios from 'axios';
import nodemailer from 'nodemailer';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import mysql from 'mysql2/promise';
import { RouterOSAPI } from 'node-routeros';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// CORS Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Path to the database files
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../NetLink Enterprise DB/[01_DATABASE]');
const GITHUB_PUBLISH_PIN = process.env.GITHUB_PUBLISH_PIN || '1993';

const stripBom = (text = '') => String(text).replace(/^\uFEFF/, '');
const readJsonFile = (filePath) => JSON.parse(stripBom(fs.readFileSync(filePath, 'utf-8')));

// Helper to safely join paths without breaking absolute Linux/Windows roots.
const splitPathSegments = (value) => String(value || '').split(/[\\/]+/).filter(Boolean);

const getSafePath = (...parts) => {
  const validParts = parts.filter(part => part !== undefined && part !== null && String(part).trim() !== '').map(String);
  if (validParts.length === 0) return '';

  const [basePart, ...restParts] = validParts;
  const normalizedRest = restParts.flatMap(splitPathSegments);
  const baseIsAbsolute = path.isAbsolute(basePart) || /^[A-Za-z]:[\\/]/.test(basePart);

  const fullPath = baseIsAbsolute
    ? path.join(basePart, ...normalizedRest)
    : path.join(...splitPathSegments(basePart), ...normalizedRest);

  const dir = path.extname(fullPath) ? path.dirname(fullPath) : fullPath;
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.error('Failed to create directory:', dir);
    }
  }
  return fullPath;
};

const logDirectoryStatus = (label, ...parts) => {
  const dirPath = getSafePath(DB_PATH, ...parts);
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`[DB DEBUG] ${label}: missing -> ${dirPath}`);
      return;
    }
    const jsonFiles = fs.readdirSync(dirPath).filter(file => file.endsWith('.json'));
    console.log(`[DB DEBUG] ${label}: ${jsonFiles.length} json file(s) -> ${dirPath}`);
  } catch (error) {
    console.error(`[DB DEBUG] ${label}: failed to inspect ${dirPath}`, error.message);
  }
};

// Utility to read JSON
const readJson = (filePath) => {
  try {
    const fullPath = getSafePath(DB_PATH, filePath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
};

const sanitizeFileName = (value) => String(value || '').replace(/[\\/:*?"<>|]/g, '').trim();

// ==========================================
// Executive AI Helpers
// ==========================================
const KNOWLEDGE_BASE_PATH = process.env.KNOWLEDGE_BASE_PATH || path.resolve(__dirname, '../../NetLink Enterprise DB/[02_KNOWLEDGE_BASE]');
const SYSTEM_CORE_PATH = process.env.SYSTEM_CORE_PATH || path.resolve(__dirname, '../../NetLink Enterprise DB/[03_SYSTEM_CORE]');
const SEARCHABLE_EXTENSIONS = new Set(['.json', '.md', '.txt']);
const SEARCH_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'whatsapp-auth',
  'session',
  'Cache',
  'Cache_Data',
  'Code Cache',
  'GPUCache',
  'Service Worker',
  'Session Storage',
  'IndexedDB',
  'Local Storage',
  'Codecs',
]);

const SEARCH_STOP_WORDS = new Set([
  'كيف', 'من', 'عن', 'على', 'في', 'الى', 'إلى', 'ما', 'ماذا', 'هل', 'هو', 'هي', 'هذا', 'هذه',
  'هناك', 'عندي', 'عنك', 'عنه', 'علي', 'عليه', 'اذا', 'إذا', 'فقط', 'جدا', 'جداً', 'اي', 'أي',
  'انت', 'أنت', 'انا', 'أنا', 'مع', 'او', 'أو', 'ثم', 'كان', 'كانت', 'يكون', 'تكون', 'لقد',
  'ابحث', 'اعطني', 'اعرض', 'لخص', 'اختصر', 'بردودك', 'لا', 'تطل', 'علي',
  'how', 'what', 'who', 'where', 'when', 'why', 'the', 'a', 'an', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'is', 'are',
]);

const normalizeSearchText = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s._/\-]+/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanUserQuery = (value = '') => String(value)
  .replace(/^[\s\-*•.،]+/u, '')
  .replace(/\s+/g, ' ')
  .trim();

const tokenizeSearchQuery = (value = '') => [...new Set(
  normalizeSearchText(cleanUserQuery(value))
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length >= 2 && !SEARCH_STOP_WORDS.has(token))
)];

const collectSearchableFiles = (dirPath, results = []) => {
  if (!fs.existsSync(dirPath)) return results;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (SEARCH_SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectSearchableFiles(fullPath, results);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SEARCHABLE_EXTENSIONS.has(ext)) continue;

    try {
      const stat = fs.statSync(fullPath);
      if (stat.size > 1024 * 1024) continue;
      results.push(fullPath);
    } catch {
      // Ignore unreadable files.
    }
  }

  return results;
};

const readSearchableFileText = (filePath) => {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const raw = stripBom(fs.readFileSync(filePath, 'utf-8'));
    if (ext === '.json') {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    }
    return raw;
  } catch {
    return '';
  }
};

const buildSearchSnippet = (content, tokens = []) => {
  const text = String(content || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const lowered = text.toLowerCase();
  let hitIndex = 0;
  for (const token of tokens) {
    const idx = lowered.indexOf(token.toLowerCase());
    if (idx >= 0) {
      hitIndex = idx;
      break;
    }
  }

  const start = Math.max(0, hitIndex - 120);
  const end = Math.min(text.length, start + 420);
  return text.slice(start, end).trim();
};

const getExecutiveStats = () => {
  const countJsonFiles = (...parts) => {
    const dirPath = getSafePath(DB_PATH, ...parts);
    try {
      if (!fs.existsSync(dirPath)) return 0;
      return fs.readdirSync(dirPath).filter(file => file.endsWith('.json')).length;
    } catch {
      return 0;
    }
  };

  return {
    subscribers: countJsonFiles('Subscribers'),
    managers: countJsonFiles('Financial', 'System_Managers'),
    suppliers: countJsonFiles('Financial', 'Suppliers'),
    investors: countJsonFiles('Financial', 'Investors'),
    iptv: countJsonFiles('System_IPTV', 'Subscribers'),
  };
};

const isSmallTalkQuery = (query = '') => {
  const normalized = normalizeSearchText(cleanUserQuery(query));
  if (!normalized) return false;

  const exactMatches = new Set([
    'مرحبا',
    'مرحباً',
    'اهلا',
    'أهلا',
    'اهلا وسهلا',
    'السلام عليكم',
    'هلا',
    'hi',
    'hello',
    'hey',
    'good morning',
    'good evening',
  ]);

  if (exactMatches.has(normalized)) return true;
  return normalized.split(' ').length <= 3 && /^(مرحبا|مرحباً|اهلا|أهلا|السلام عليكم|هلا|hi|hello|hey)\b/i.test(normalized);
};

const isIdentityQuery = (query = '') => {
  const normalized = normalizeSearchText(cleanUserQuery(query));
  return /^(من انت|من أنت|مين انت|مين أنت|عرفني بنفسك|who are you|what are you)$/i.test(normalized);
};

const buildSmallTalkReply = (language = 'ar') => (
  language === 'ar'
    ? 'مرحباً، أنا جاهز. اطلب مني شيئًا محددًا مثل: ابحث عن برمجة LiteBeam، اعرض بيانات المشتركين، أو لخص الباقات.'
    : 'Hello, I am ready. Ask me something specific such as: find the LiteBeam programming guide, show subscriber data, or summarize packages.'
);

const buildIdentityReply = (language = 'ar') => (
  language === 'ar'
    ? 'أنا مساعدك التنفيذي الذكي. أستطيع البحث في البيانات الداخلية والملفات والويب ومساعدتك في المهام التي تطلبها.'
    : 'I am your Executive AI assistant. I can search internal data, files, and the web and help with the tasks you request.'
);

const isInternetRequest = (query = '') => {
  const normalized = normalizeSearchText(cleanUserQuery(query));
  return /(ابحث في الانترنت|ابحث في الإنترنت|من الانترنت|من الإنترنت|في الانترنت|في الإنترنت|الويب|على الويب|اونلاين|online|internet|web|google it|search online|search the web)/i.test(normalized);
};

const isAffirmativeQuery = (query = '') => /^(نعم|نعم اريد|نعم أريد|نعم ارغب|نعم أرغب|اكيد|أكيد|تمام|موافق|yes|sure|ok|okay|please do)$/i.test(normalizeSearchText(cleanUserQuery(query)));

const stripInternetCommand = (query = '') => {
  return cleanUserQuery(String(query || ''))
    .replace(/ابحث في الانترنت عن/gi, '')
    .replace(/ابحث في الإنترنت عن/gi, '')
    .replace(/ابحث على الويب عن/gi, '')
    .replace(/search the web for/gi, '')
    .replace(/search online for/gi, '')
    .replace(/google it/gi, '')
    .trim();
};

const decodeHtmlEntities = (text = '') => String(text)
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeDuckDuckGoUrl = (rawUrl = '') => {
  try {
    const url = new URL(rawUrl, 'https://html.duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : url.toString();
  } catch {
    return rawUrl;
  }
};

const resolveInternetSearchQuery = (query = '', history = []) => {
  if (isInternetRequest(query)) {
    return stripInternetCommand(query) || query;
  }

  if (!isAffirmativeQuery(query)) return '';

  const reversed = [...history].reverse();
  const lastInternetUserMessage = reversed.find((item) => item?.role === 'user' && isInternetRequest(item?.content || ''));
  if (lastInternetUserMessage?.content) {
    return stripInternetCommand(lastInternetUserMessage.content) || lastInternetUserMessage.content;
  }

  return '';
};

const fetchDuckDuckGoResults = async (query = '') => {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AI-NetLink-Executive/1.0',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error('Web search request failed.');
  }

  const html = await response.text();
  const results = [];
  const regex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;
  let match;
  while ((match = regex.exec(html)) && results.length < 5) {
    const [, href, titleHtml, snippetHtml] = match;
    const title = decodeHtmlEntities(titleHtml);
    const snippet = decodeHtmlEntities(snippetHtml);
    const normalizedUrl = normalizeDuckDuckGoUrl(href);
    if (!title || !snippet) continue;

    results.push({
      title,
      snippet,
      url: normalizedUrl,
    });
  }

  if (results.length === 0) {
    const altRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = altRegex.exec(html)) && results.length < 5) {
      const [, href, titleHtml] = match;
      const title = decodeHtmlEntities(titleHtml);
      if (!title) continue;
      results.push({
        title,
        snippet: '',
        url: normalizeDuckDuckGoUrl(href),
      });
    }
  }

  return results.slice(0, 5);
};

const buildInternetDirectReply = (language = 'ar', searchQuery = '', results = [], preferBrief = false) => {
  if (!results.length) {
    return language === 'ar'
      ? `بحثت في الإنترنت عن: ${searchQuery}، لكن لم أحصل الآن على نتائج ويب واضحة كفاية.`
      : `I searched the web for: ${searchQuery}, but I could not get clear enough web results right now.`;
  }

  const topResults = results.slice(0, preferBrief ? 2 : 3);
  if (language === 'ar') {
    const lines = topResults.map((item, index) => `${index + 1}. ${item.title}${item.snippet ? `: ${item.snippet}` : ''}`);
    return `وجدت على الإنترنت معلومات عن: ${searchQuery}.\n${lines.join('\n')}`;
  }

  const lines = topResults.map((item, index) => `${index + 1}. ${item.title}${item.snippet ? `: ${item.snippet}` : ''}`);
  return `I found web information about: ${searchQuery}.\n${lines.join('\n')}`;
};

const isStatsQuery = (query = '') => {
  const normalized = normalizeSearchText(cleanUserQuery(query));
  return /(كم عدد|عدد\s+(المشتركين|المدراء|الموردين|المستثمرين|iptv)|احصائ|إحصائ|statistics|stats|count of|summary of counts|ملخص ارقام|ملخص أرقام)/i.test(normalized);
};

const sanitizeExecutiveReply = (reply = '') => {
  let text = String(reply || '').trim();

  const sectionPatterns = [
    /\n?\s*المصادر\s*:[\s\S]*$/i,
    /\n?\s*الوثائق المفيدة[^\n]*:[\s\S]*$/i,
    /\n?\s*أسماء الملفات المفيدة[^\n]*:[\s\S]*$/i,
    /\n?\s*useful documents[^\n]*:[\s\S]*$/i,
    /\n?\s*useful file names[^\n]*:[\s\S]*$/i,
    /\n?\s*sources\s*:[\s\S]*$/i,
  ];

  for (const pattern of sectionPatterns) {
    text = text.replace(pattern, '').trim();
  }

  text = text.replace(/`[^`]*NetLink Enterprise DB[^`]*`/gi, '').trim();
  text = text.replace(/\s{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text;
};

const searchEnterpriseKnowledge = (query, limit = 6) => {
  const tokens = tokenizeSearchQuery(query);
  if (tokens.length === 0) return [];

  const roots = [
    getSafePath(DB_PATH, 'Subscribers'),
    getSafePath(DB_PATH, 'Financial'),
    getSafePath(DB_PATH, 'Assets_Inventory'),
    getSafePath(DB_PATH, 'CRM'),
    getSafePath(DB_PATH, 'System'),
    getSafePath(DB_PATH, 'System_IPTV'),
    KNOWLEDGE_BASE_PATH,
    SYSTEM_CORE_PATH,
  ];

  const candidates = [];
  for (const rootPath of roots) {
    for (const filePath of collectSearchableFiles(rootPath, [])) {
      const relativePath = path.relative(path.resolve(__dirname, '../..'), filePath).replace(/\\/g, '/');
      const pathText = normalizeSearchText(relativePath);
      const content = readSearchableFileText(filePath);
      if (!content) continue;

      const loweredContent = normalizeSearchText(content);
      let score = 0;
      for (const token of tokens) {
        if (pathText.includes(token)) score += 12;
        if (loweredContent.includes(token)) score += 4;
      }

      const hasStrongHit = tokens.some((token) => pathText.includes(token) || loweredContent.includes(token));
      if (score < 8 || !hasStrongHit) continue;
      candidates.push({
        filePath,
        relativePath,
        score,
        snippet: buildSearchSnippet(content, tokens),
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

const hasBrevityPreference = (history = [], query = '') => {
  const combined = [...history.map(item => item?.content || ''), cleanUserQuery(query)].join(' \n ');
  return /(اختصر|مختصر|لا تطل|قصير|قصيرة|short|brief|concise)/i.test(combined);
};

const resolveAiProvider = (aiSettings = {}, providerOverride = '') => {
  const providers = Array.isArray(aiSettings.providers) ? aiSettings.providers : [];
  const enabledProviders = providers.filter(provider => provider && provider.enabled);
  if (enabledProviders.length === 0) throw new Error('No enabled AI provider was found.');

  if (providerOverride) {
    const exact = enabledProviders.find(provider => provider.id === providerOverride);
    if (exact) return exact;
  }

  const model = String(aiSettings.primaryModel || '').toLowerCase();
  const preferredId =
    model.startsWith('gemini') ? 'google' :
    model.startsWith('gpt') ? 'openai' :
    model.startsWith('claude') ? 'anthropic' :
    model.startsWith('grok') ? 'grok' :
    model.startsWith('mistral') ? 'mistral' :
    model.startsWith('local') ? 'local' :
    '';

  return enabledProviders.find(provider => provider.id === preferredId) || enabledProviders[0];
};

const resolveAiModelName = (primaryModel = '', providerId = '') => {
  const model = String(primaryModel || '').trim();
  if (!model) {
    return providerId === 'local' ? 'llama3' : 'gemini-2.0-flash';
  }

  if (providerId === 'local') {
    if (model === 'local-llama-3') return 'llama3';
    return model.replace(/^local-/, '').replace(/-/g, '');
  }

  return model;
};

const isGroqProvider = (provider = {}) => {
  const apiKey = String(provider?.apiKey || '').trim();
  const endpoint = String(provider?.endpoint || '').toLowerCase();
  return apiKey.startsWith('gsk_') || endpoint.includes('api.groq.com');
};

const resolveProviderModel = (primaryModel = '', provider = {}) => {
  const baseModel = resolveAiModelName(primaryModel, provider.id);

  if (isGroqProvider(provider)) {
    if (!baseModel || baseModel === 'grok-1') {
      return 'llama-3.3-70b-versatile';
    }
    return baseModel;
  }

  return baseModel;
};

const buildExecutivePrompt = ({ query, language, stats, sources, history, includeStats, preferBrief, internetResults, internetRequested }) => {
  const intro = language === 'ar'
    ? 'أنت المساعد التنفيذي الذكي الخاص بنظام SAS NET. تعامل مع المستخدم كصاحب صلاحيات عليا. استخدم البيانات الداخلية عند الحاجة، ويمكنك أيضا الإجابة من معرفتك العامة. إذا طلب الإنترنت واُعطيت نتائج ويب فاستفد منها بوضوح.'
    : 'You are the Executive AI assistant for SAS NET. Treat the user as a high-authority decision maker. Use internal data when relevant, and you may also answer from general knowledge. If the user requests the internet and web results are provided, use them clearly.';

  const statsText = language === 'ar'
    ? `إحصاءات سريعة: المشتركون ${stats.subscribers}، المدراء ${stats.managers}، الموردون ${stats.suppliers}، المستثمرون ${stats.investors}، IPTV ${stats.iptv}.`
    : `Quick stats: subscribers ${stats.subscribers}, managers ${stats.managers}, suppliers ${stats.suppliers}, investors ${stats.investors}, IPTV ${stats.iptv}.`;

  const sourcesText = sources.length
    ? sources.map((source, index) => `#${index + 1} ${source.relativePath}\n${source.snippet}`).join('\n\n')
    : (language === 'ar' ? 'لا توجد نتائج مطابقة في الوثائق الداخلية.' : 'No matching internal documents were found.');

  const internetText = Array.isArray(internetResults) && internetResults.length > 0
    ? internetResults.map((item, index) => `#${index + 1} ${item.title}\n${item.snippet}\n${item.url || ''}`).join('\n\n')
    : (language === 'ar' ? 'لا توجد نتائج ويب مرفقة.' : 'No web results were provided.');

  const historyText = Array.isArray(history) && history.length > 0
    ? history.slice(-8).map((item) => `${item.role === 'assistant' ? 'ASSISTANT' : 'USER'}: ${item.content}`).join('\n')
    : '';

  return `${intro}

${includeStats ? statsText : ''}

${historyText ? `Conversation History:\n${historyText}\n` : ''}
User Request:
${query}

Internal Sources:
${sourcesText}

${internetRequested ? `Web Results:\n${internetText}\n` : ''}

${language === 'ar'
  ? 'قدم الجواب بالعربية بشكل عملي ومختصر. إذا كان السؤال عامًا فجاوب طبيعيًا من معرفتك. إذا طلب المستخدم الإنترنت فاعتمد أيضًا على نتائج الويب المرفقة. لا تسرد المصادر أو المسارات أو أسماء الملفات أو الإحصاءات إلا إذا طلبت ذلك صراحة. لا تقل "المصادر" ولا "الوثائق المفيدة" داخل الجواب.'
  : 'Answer in practical concise Arabic or English as needed. If the question is general, answer naturally from your knowledge. If the director requests the internet, also rely on the provided web results. Do not list sources, file paths, or stats unless explicitly requested. Do not include sections named Sources or Useful Documents.'}
${preferBrief ? (language === 'ar' ? '\nالآن التزم برد قصير جدا من سطر إلى سطرين فقط.' : '\nNow strictly answer in only 1 to 2 short lines.') : ''}
`;
};

const callOpenAiCompatible = async ({ baseUrl, apiKey, model, prompt, extraHeaders = {} }) => {
  const response = await fetch(`${String(baseUrl).replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error || 'AI provider request failed.');
  }

  return data?.choices?.[0]?.message?.content || '';
};

const callAnthropic = async ({ apiKey, model, prompt }) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1400,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.error?.type || 'Anthropic request failed.');
  }

  return Array.isArray(data?.content)
    ? data.content.map(item => item?.text || '').join('\n').trim()
    : '';
};

const callGemini = async ({ apiKey, model, prompt }) => {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.2,
      },
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Gemini request failed.');
  }

  return data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('\n').trim() || '';
};

const callLocalAi = async ({ endpoint, model, prompt, apiKey }) => {
  const normalizedBase = String(endpoint || 'http://localhost:11434').replace(/\/+$/, '');

  if (/\/v1$/i.test(normalizedBase) || /localhost:1234/i.test(normalizedBase) || /127\.0\.0\.1:1234/i.test(normalizedBase)) {
    return callOpenAiCompatible({
      baseUrl: normalizedBase,
      apiKey: apiKey || 'local',
      model,
      prompt,
    });
  }

  const response = await fetch(`${normalizedBase}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Local AI request failed.');
  }

  return data?.message?.content || '';
};

const executeExecutiveAi = async ({ aiSettings, query, history = [], language = 'ar', providerId = '' }) => {
  const effectiveQuery = cleanUserQuery(query);
  const provider = resolveAiProvider(aiSettings, providerId);
  const model = resolveProviderModel(aiSettings?.primaryModel, provider);
  const isSmallTalk = isSmallTalkQuery(effectiveQuery);
  const isIdentity = isIdentityQuery(effectiveQuery);
  const includeStats = isStatsQuery(effectiveQuery);
  const internetSearchQuery = resolveInternetSearchQuery(effectiveQuery, history);
  const internetRequested = Boolean(internetSearchQuery);
  const preferBrief = hasBrevityPreference(history, effectiveQuery);
  const stats = getExecutiveStats();
  const sources = isSmallTalk ? [] : searchEnterpriseKnowledge(effectiveQuery, 6);
  const internetResults = internetRequested ? await fetchDuckDuckGoResults(internetSearchQuery) : [];

  if (isSmallTalk) {
    return {
      reply: buildSmallTalkReply(language),
      provider: {
        id: provider.id,
        name: provider.name,
        model,
      },
      sources: [],
      stats: null,
    };
  }

  if (isIdentity) {
    return {
      reply: buildIdentityReply(language),
      provider: {
        id: provider.id,
        name: provider.name,
        model,
      },
      sources: [],
      stats: null,
    };
  }

  if (internetRequested) {
    return {
      reply: buildInternetDirectReply(language, internetSearchQuery, internetResults, preferBrief),
      provider: {
        id: provider.id,
        name: provider.name,
        model,
      },
      sources: internetResults.map((item) => ({
        path: item.url || item.title,
        snippet: item.snippet || item.title,
        score: 100,
      })),
      stats: null,
    };
  }

  const prompt = buildExecutivePrompt({ query: effectiveQuery, language, stats, sources, history, includeStats, preferBrief, internetResults, internetRequested });

  if (provider.id !== 'local' && !String(provider.apiKey || '').trim()) {
    throw new Error(`API key is missing for provider: ${provider.name}`);
  }

  let reply = '';
  switch (provider.id) {
    case 'google':
      reply = await callGemini({ apiKey: provider.apiKey, model, prompt });
      break;
    case 'anthropic':
      reply = await callAnthropic({ apiKey: provider.apiKey, model, prompt });
      break;
    case 'local':
      reply = await callLocalAi({ endpoint: provider.endpoint, model, prompt, apiKey: provider.apiKey });
      break;
    case 'openai':
      reply = await callOpenAiCompatible({ baseUrl: provider.endpoint || 'https://api.openai.com/v1', apiKey: provider.apiKey, model, prompt });
      break;
    case 'openrouter':
      reply = await callOpenAiCompatible({
        baseUrl: provider.endpoint || 'https://openrouter.ai/api/v1',
        apiKey: provider.apiKey,
        model,
        prompt,
        extraHeaders: { 'HTTP-Referer': 'https://netlink.local', 'X-Title': 'AI NetLink' },
      });
      break;
    case 'grok':
      if (isGroqProvider(provider)) {
        reply = await callOpenAiCompatible({
          baseUrl: provider.endpoint || 'https://api.groq.com/openai/v1',
          apiKey: provider.apiKey,
          model,
          prompt,
        });
      } else {
        reply = await callOpenAiCompatible({ baseUrl: provider.endpoint || 'https://api.x.ai/v1', apiKey: provider.apiKey, model, prompt });
      }
      break;
    case 'mistral':
      reply = await callOpenAiCompatible({ baseUrl: provider.endpoint || 'https://api.mistral.ai/v1', apiKey: provider.apiKey, model, prompt });
      break;
    default:
      reply = await callOpenAiCompatible({ baseUrl: provider.endpoint, apiKey: provider.apiKey, model, prompt });
      break;
  }

  return {
    reply: sanitizeExecutiveReply(reply),
    provider: {
      id: provider.id,
      name: provider.name,
      model,
    },
    sources: sources.map(source => ({
      path: source.relativePath,
      snippet: source.snippet,
      score: source.score,
    })),
    stats: null,
  };
};

// ==========================================
// Gateways Config Manager
// ==========================================
const GATEWAYS_CONFIG_PATH = getSafePath(DB_PATH, 'System', 'gateways_config.json');

const getGatewaysConfig = () => {
  try {
    if (fs.existsSync(GATEWAYS_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(GATEWAYS_CONFIG_PATH, 'utf-8'));
    }
  } catch(e) { }
  
  return {
    sms: { url: 'http://triple-core.ps/sendbulksms.php', user_name: 'netlink', user_pass: 'Sniper.2591993', sender: 'netlink' },
    whatsapp: { delay: 1500 },
    email: { host: '', port: 465, user: '', pass: '' }
  };
};

const saveGatewaysConfig = (config) => {
  try {
    if (config.whatsapp && config.whatsapp.delay < 1500) {
      config.whatsapp.delay = 1500; // Hard limit for safety
    }
    fs.writeFileSync(GATEWAYS_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch(e) {
    return false;
  }
};

// ==========================================
// Message Data Manager (Templates & Groups)
// ==========================================
const MESSAGE_DATA_PATH = getSafePath(DB_PATH, 'System', 'message_data.json');

const getMessageDataConfig = () => {
  try {
    if (!fs.existsSync(path.dirname(MESSAGE_DATA_PATH))) {
      fs.mkdirSync(path.dirname(MESSAGE_DATA_PATH), { recursive: true });
    }
    if (fs.existsSync(MESSAGE_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(MESSAGE_DATA_PATH, 'utf-8'));
    }
  } catch(e) { }
  
  return { templates: [], groups: [] };
};

const saveMessageDataConfig = (data) => {
  try {
    fs.writeFileSync(MESSAGE_DATA_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch(e) { return false; }
};

app.get('/api/messages/data', (req, res) => {
  res.json({ data: getMessageDataConfig() });
});

app.post('/api/messages/data', (req, res) => {
  const success = saveMessageDataConfig(req.body);
  if (success) res.json({ message: 'Settings saved.' });
  else res.status(500).json({ error: 'Failed to save settings.' });
});

app.get('/api/gateways', (req, res) => {
  res.json({ data: getGatewaysConfig() });
});

app.post('/api/gateways', (req, res) => {
  const success = saveGatewaysConfig(req.body);
  if (success) res.json({ message: 'Settings saved.' });
  else res.status(500).json({ error: 'Failed to save settings.' });
});

// ==========================================
// Network Infrastructure Config Manager
// ==========================================
const NETWORK_CONFIG_PATH = getSafePath(DB_PATH, 'System', 'network_config.json');

const getNetworkConfig = () => {
  try {
    if (!fs.existsSync(path.dirname(NETWORK_CONFIG_PATH))) {
      fs.mkdirSync(path.dirname(NETWORK_CONFIG_PATH), { recursive: true });
    }
    if (fs.existsSync(NETWORK_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(NETWORK_CONFIG_PATH, 'utf-8'));
    }
  } catch(e) { }
  
  return {
    routers: [], // Array of { id, name, host, user, password, port }
    mikrotik: { host: '', user: '', password: '', port: 8728 }, // Legacy config
    sas4: { host: '', user: '', password: '', database: 'sas4' }, // Legacy config
    defaultExpiredProfile: '', // Global fallback
    landingPageUrl: '' // Redirection URL
  };
};

const saveNetworkConfig = (config) => {
  try {
    fs.writeFileSync(NETWORK_CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch(e) { return false; }
};

app.get('/api/network/config', (req, res) => {
  res.json({ data: getNetworkConfig() });
});

app.post('/api/network/config', (req, res) => {
  const success = saveNetworkConfig(req.body);
  if (success) res.json({ message: 'Settings saved.' });
  else res.status(500).json({ error: 'Failed to save settings.' });
});

app.post('/api/network/test-connection', async (req, res) => {
    let host, user, password, port;
    
    if (req.body && req.body.host) {
        // Use provided credentials directly (for multi-router testing before saving)
        host = req.body.host;
        user = req.body.user;
        password = req.body.password;
        port = req.body.port;
    } else {
        // Fallback to default mikrotik config
        const config = getNetworkConfig();
        if (!config.mikrotik.host || !config.mikrotik.user) {
            return res.status(400).json({ error: 'MikroTik configuration missing.' });
        }
        host = config.mikrotik.host;
        user = config.mikrotik.user;
        password = config.mikrotik.password;
        port = config.mikrotik.port;
    }

    const conn = new RouterOSAPI({
        host,
        user,
        password,
        port: parseInt(port, 10) || 8728
    });

    try {
        await conn.connect();
        // Just print identity as a connection test
        const identity = await conn.write('/system/identity/print');
        res.json({ data: { message: 'Connected successfully', identity: identity[0]?.name || 'Unknown' } });
    } catch (error) {
        console.error('MikroTik Connection Error:', error.message);
        res.status(500).json({ error: `MikroTik connection failed: ${error.message}` });
    } finally {
        conn.close();
    }
});

app.get('/api/network/status/:username', async (req, res) => {
    const username = req.params.username;
    const config = getNetworkConfig();
    const routers = config.routers || [];
    
    // Fallback to legacy config if no routers are set
    if (routers.length === 0) {
        if (!config.mikrotik.host || !config.mikrotik.user) {
            return res.status(400).json({ error: 'MikroTik configuration missing.' });
        }
        routers.push({ ...config.mikrotik, name: 'Main Router' });
    }

    let isOnline = false;
    let details = null;

    for (const router of routers) {
        if (!router.host || !router.user) continue;
        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password || '',
            port: parseInt(router.port, 10) || 8728,
            timeout: 5
        });

        try {
            await conn.connect();
            // Check PPPoE
            const activePpp = await conn.write('/ppp/active/print', ['?name=' + username]);
            if (activePpp && activePpp.length > 0) {
                isOnline = true;
                details = activePpp[0];
                break;
            }
            // Check Hotspot
            const activeHotspot = await conn.write('/ip/hotspot/active/print', ['?user=' + username]);
            if (activeHotspot && activeHotspot.length > 0) {
                isOnline = true;
                details = activeHotspot[0];
                break;
            }
        } catch (e) {
            console.error(`Status check failed on router ${router.host}:`, e.message);
        } finally {
            try { conn.close(); } catch(e) {}
        }
    }
    
    res.json({ data: { online: isOnline, details } });
});

// GET Batch Status for all subscribers
app.get('/api/network/status-batch', async (req, res) => {
    const config = getNetworkConfig();
    const routers = config.routers || [];
    
    if (routers.length === 0 && config.mikrotik.host) {
        routers.push({ ...config.mikrotik, name: 'Main Router' });
    }

    if (routers.length === 0) {
        return res.json({ data: { onlineUsers: [] } });
    }

    const onlineUsers = new Set();
    const failedRouters = [];
    const resultsPerRouter = {};
    const fullRawData = [];

    // Helper to safely convert RouterOS values (which can be Buffers) to strings
    const toStr = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val.trim();
        if (Buffer.isBuffer(val)) return val.toString('utf-8').trim();
        return String(val).trim();
    };

    for (const router of routers) {
        if (!router.host || !router.user) continue;
        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password || '',
            port: parseInt(router.port, 10) || 8728,
            timeout: 10
        });

        const routerId = router.id || router.host;
        resultsPerRouter[routerId] = { name: router.name || router.host, pppCount: 0, hotspotCount: 0, rawSample: null };

        try {
            await conn.connect();
            
            // ─── PPPoE Check (Isolated) ───
            try {
                const pppActive = await conn.write('/ppp/active/print');
                if (pppActive && Array.isArray(pppActive)) {
                    resultsPerRouter[routerId].pppCount = pppActive.length;
                    if (pppActive.length > 0) {
                        resultsPerRouter[routerId].rawSample = pppActive[0];
                        fullRawData.push({ router: router.name, type: 'ppp', data: pppActive });
                    }
                    pppActive.forEach(u => {
                        const name = toStr(u.name || u.user || u['.id']);
                        if (name) onlineUsers.add(name.toLowerCase());
                    });
                }
            } catch (err) {
                resultsPerRouter[routerId].pppError = err.message;
            }

            // ─── Hotspot Check (Isolated) ───
            try {
                const hotspotActive = await conn.write('/ip/hotspot/active/print');
                if (hotspotActive && Array.isArray(hotspotActive)) {
                    resultsPerRouter[routerId].hotspotCount = hotspotActive.length;
                    if (hotspotActive.length > 0 && !resultsPerRouter[routerId].rawSample) {
                        resultsPerRouter[routerId].rawSample = hotspotActive[0];
                        fullRawData.push({ router: router.name, type: 'hotspot', data: hotspotActive });
                    }
                    hotspotActive.forEach(u => {
                        const name = toStr(u.user || u.name);
                        if (name) onlineUsers.add(name.toLowerCase());
                    });
                }
            } catch (err) {
                resultsPerRouter[routerId].hotspotError = err.message;
            }
            
        } catch (error) {
            failedRouters.push(router.name || router.host);
            resultsPerRouter[routerId].connectionError = error.message;
        } finally {
            try { conn.close(); } catch(e) {}
        }
    }

    // Save audit log for debugging
    try {
        const auditPath = getSafePath(DB_PATH, 'System', 'mikrotik_status_audit.json');
        fs.writeFileSync(auditPath, JSON.stringify({ timestamp: new Date().toISOString(), results: fullRawData }, null, 2));
    } catch (e) {
        console.error('Failed to write audit log:', e);
    }

    const onlineList = Array.from(onlineUsers);
    res.json({ data: { onlineUsers: onlineList, failedRouters, resultsPerRouter } });
});

// DISCONNECT (Kick) a subscriber from all routers
app.post('/api/network/disconnect/:username', async (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const config = getNetworkConfig();
    const routers = config.routers || [];
    if (routers.length === 0 && config.mikrotik.host) {
        routers.push({ ...config.mikrotik, name: 'Main Router' });
    }

    let itemsRemoved = 0;
    const errors = [];

    for (const router of routers) {
        if (!router.host || !router.user) continue;
        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password || '',
            port: parseInt(router.port, 10) || 8728,
            timeout: 5
        });

        try {
            await conn.connect();
            
            // ─── Disconnect from PPP Active ───
            try {
                // Find .id for this username first
                const active = await conn.write('/ppp/active/print', [`?name=${username}`]);
                if (active && Array.isArray(active) && active.length > 0) {
                    for (const session of active) {
                        if (session['.id']) {
                            // CORRECT SYNTAX: parameters must start with '=' in RouterOS API
                            await conn.write('/ppp/active/remove', [`=.id=${session['.id']}`]);
                            itemsRemoved++;
                        }
                    }
                }
            } catch (err) {
                console.error(`PPP disconnect failed on ${router.host}:`, err.message);
                errors.push(`${router.name} (PPP): ${err.message}`);
            }

            // ─── Disconnect from Hotspot Active ───
            try {
                const active = await conn.write('/ip/hotspot/active/print', [`?user=${username}`]);
                if (active && Array.isArray(active) && active.length > 0) {
                    for (const session of active) {
                        if (session['.id']) {
                            // CORRECT SYNTAX: parameters must start with '=' in RouterOS API
                            await conn.write('/ip/hotspot/remove', [`=.id=${session['.id']}`]);
                            itemsRemoved++;
                        }
                    }
                }
            } catch (err) {
                // Ignore hotspot errors if not configured on this router
                if (!err.message.includes('no such command')) {
                    errors.push(`${router.name} (Hotspot): ${err.message}`);
                }
            }

        } catch (error) {
            errors.push(`Connection to ${router.name} failed: ${error.message}`);
        } finally {
            try { conn.close(); } catch(e) {}
        }
    }

    res.json({ 
        message: itemsRemoved > 0 ? `Successfully disconnected ${itemsRemoved} sessions.` : 'No active sessions found for this user.', 
        itemsRemoved,
        errors: errors.length > 0 ? errors : null 
    });
});

// DISCONNECT ALL (Kick Everyone) from all routers
app.post('/api/network/disconnect-all', async (req, res) => {
    const config = getNetworkConfig();
    const routers = config.routers || [];
    if (routers.length === 0 && config.mikrotik.host) {
        routers.push({ ...config.mikrotik, name: 'Main Router' });
    }

    let itemsRemoved = 0;
    const errors = [];

    for (const router of routers) {
        if (!router.host || !router.user) continue;
        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password || '',
            port: parseInt(router.port, 10) || 8728,
            timeout: 15 // Longer timeout for bulk removal
        });

        try {
            await conn.connect();
            
            // ─── Disconnect ALL from PPP Active ───
            try {
                const active = await conn.write('/ppp/active/print');
                if (active && Array.isArray(active) && active.length > 0) {
                    for (const session of active) {
                        if (session['.id']) {
                            await conn.write('/ppp/active/remove', [`=.id=${session['.id']}`]);
                            itemsRemoved++;
                        }
                    }
                }
            } catch (err) {
                errors.push(`${router.name} (PPP): ${err.message}`);
            }

            // ─── Disconnect ALL from Hotspot Active ───
            try {
                const active = await conn.write('/ip/hotspot/active/print');
                if (active && Array.isArray(active) && active.length > 0) {
                    for (const session of active) {
                        if (session['.id']) {
                            await conn.write('/ip/hotspot/remove', [`=.id=${session['.id']}`]);
                            itemsRemoved++;
                        }
                    }
                }
            } catch (err) {
                if (!err.message.includes('no such command')) {
                    errors.push(`${router.name} (Hotspot): ${err.message}`);
                }
            }

        } catch (error) {
            errors.push(`Connection to ${router.name} failed: ${error.message}`);
        } finally {
            try { conn.close(); } catch(e) {}
        }
    }

    res.json({ 
        message: `Total of ${itemsRemoved} sessions disconnected across all routers.`, 
        itemsRemoved,
        errors: errors.length > 0 ? errors : null 
    });
});

// ==========================================
// MikroTik Secret Management (Delete/Disable/Enable)
// ==========================================

// DELETE Secret (Remove from MikroTik only)
app.post('/api/network/secrets/delete/:username', async (req, res) => {
    const { username } = req.params;
    const config = getNetworkConfig();
    const routers = config.routers || [];
    if (routers.length === 0 && config.mikrotik.host) routers.push({ ...config.mikrotik, name: 'Main Router' });

    let itemsRemoved = 0;
    const errors = [];

    for (const router of routers) {
        if (!router.host || !router.user) continue;
        const conn = new RouterOSAPI({ host: router.host, user: router.user, password: router.password || '', port: parseInt(router.port, 10) || 8728 });
        try {
            await conn.connect();
            const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
            if (secrets && Array.isArray(secrets)) {
                for (const s of secrets) {
                    if (s['.id']) {
                        await conn.write('/ppp/secret/remove', [`=.id=${s['.id']}`]);
                        itemsRemoved++;
                    }
                }
            }
        } catch (err) { errors.push(`${router.name}: ${err.message}`); } finally { try { conn.close(); } catch(e) {} }
    }
    res.json({ success: true, itemsRemoved, errors: errors.length > 0 ? errors : null });
});

// DISABLE Secret
app.post('/api/network/secrets/disable/:username', async (req, res) => {
    const { username } = req.params;
    const config = getNetworkConfig();
    const routers = config.routers || [];
    if (routers.length === 0 && config.mikrotik.host) routers.push({ ...config.mikrotik, name: 'Main Router' });

    let count = 0;
    for (const router of routers) {
        const conn = new RouterOSAPI({ host: router.host, user: router.user, password: router.password || '', port: parseInt(router.port, 10) || 8728 });
        try {
            await conn.connect();
            const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
            for (const s of secrets) {
                if (s['.id']) {
                    await conn.write('/ppp/secret/set', [`=.id=${s['.id']}`, '=disabled=yes']);
                    count++;
                }
            }
        } catch (err) { console.error(err); } finally { try { conn.close(); } catch(e) {} }
    }
    res.json({ success: true, count });
});

// ENABLE Secret
app.post('/api/network/secrets/enable/:username', async (req, res) => {
    const { username } = req.params;
    const config = getNetworkConfig();
    const routers = config.routers || [];
    if (routers.length === 0 && config.mikrotik.host) routers.push({ ...config.mikrotik, name: 'Main Router' });

    let count = 0;
    for (const router of routers) {
        const conn = new RouterOSAPI({ host: router.host, user: router.user, password: router.password || '', port: parseInt(router.port, 10) || 8728 });
        try {
            await conn.connect();
            const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
            for (const s of secrets) {
                if (s['.id']) {
                    await conn.write('/ppp/secret/set', [`=.id=${s['.id']}`, '=disabled=no']);
                    count++;
                }
            }
        } catch (err) { console.error(err); } finally { try { conn.close(); } catch(e) {} }
    }
    res.json({ success: true, count });
});


// ==========================================
// Network Profiles Manager
// ==========================================
const PROFILES_PATH = getSafePath(DB_PATH, 'CRM', 'profiles.json');

const getProfiles = () => {
    try {
        if (!fs.existsSync(path.dirname(PROFILES_PATH))) {
            fs.mkdirSync(path.dirname(PROFILES_PATH), { recursive: true });
        }
        if (fs.existsSync(PROFILES_PATH)) {
            return JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf-8'));
        }
    } catch(e) { }
    return [];
};

const saveProfiles = (profiles) => {
    try {
        fs.writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2));
        return true;
    } catch(e) { return false; }
};

app.get('/api/network/profiles', (req, res) => {
    res.json(getProfiles());
});

app.post('/api/network/profiles', (req, res) => {
    const profiles = getProfiles();
    const newProfile = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...req.body };
    profiles.push(newProfile);
    if (saveProfiles(profiles)) res.json({ message: 'Profile created', data: newProfile });
    else res.status(500).json({ error: 'Failed to save profile' });
});

app.put('/api/network/profiles/:id', (req, res) => {
    let profiles = getProfiles();
    const index = profiles.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Profile not found' });
    profiles[index] = { ...profiles[index], ...req.body };
    if (saveProfiles(profiles)) res.json({ message: 'Profile updated', data: profiles[index] });
    else res.status(500).json({ error: 'Failed to update profile' });
});

app.delete('/api/network/profiles/:id', (req, res) => {
    let profiles = getProfiles();
    const filtered = profiles.filter(p => p.id !== req.params.id);
    if (filtered.length === profiles.length) return res.status(404).json({ error: 'Profile not found' });
    if (saveProfiles(filtered)) res.json({ message: 'Profile deleted' });
    else res.status(500).json({ error: 'Failed to delete profile' });
});
app.get('/api/network/routers', (req, res) => {
    const config = getNetworkConfig();
    const routers = config.routers || [];
    res.json(routers.map(r => ({ id: r.id, name: r.name, host: r.host })));
});

app.post('/api/network/profiles/:id/push', async (req, res) => {
    const { target } = req.body; // 'all' or a specific router ID
    let profiles = getProfiles();
    const profile = profiles.find(p => p.id === req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    const config = getNetworkConfig();
    let routersToPush = [];

    if (target && target !== 'all') {
        const specificRouter = config.routers.find(r => r.id === target);
        if (specificRouter) {
            routersToPush.push(specificRouter);
        } else {
            return res.status(404).json({ error: 'Target router not found' });
        }
    } else {
        routersToPush = config.routers || [];
    }

    if (routersToPush.length === 0) return res.status(400).json({ error: 'No routers configured to push to.' });

    let rateLimitString = '';
    if (profile.downloadSpeed && profile.uploadSpeed) {
        rateLimitString = `${profile.uploadSpeed}/${profile.downloadSpeed}`;
        if (profile.burstEnabled && profile.burstRate && profile.burstThreshold && profile.burstTime) {
            rateLimitString += ` ${profile.burstRate} ${profile.burstThreshold} ${profile.burstTime} ${profile.queuePriority || 8}`;
        }
    }

    const formatMikrotikTime = (value, unit) => {
        if (!value) return null;
        switch(unit) {
            case 'months': return `${value * 30}d`;
            case 'days': return `${value}d`;
            case 'hours': return `${value}h`;
            case 'minutes': return `${value}m`;
            default: return `${value}d`;
        }
    };

    const sessionTimeout = profile.limitByTime?.enabled ? formatMikrotikTime(profile.limitByTime.value, profile.limitByTime.unit) : null;
    
    // Convert MB to bytes for data limits (if router supports them in profiles)
    const limitBytesIn = profile.limitByUpload?.enabled ? profile.limitByUpload.value * 1024 * 1024 : null;
    const limitBytesOut = profile.limitByDownload?.enabled ? profile.limitByDownload.value * 1024 * 1024 : null;
    const limitBytesTotal = profile.limitByTotalTraffic?.enabled ? profile.limitByTotalTraffic.value * 1024 * 1024 : null;

    const pushResults = [];

    for (const router of routersToPush) {
        if (!router.host || !router.user) continue;

        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password,
            port: router.port
        });

        try {
            await conn.connect();
            
            // Push to PPPoE
            if (profile.type === 'pppoe' || profile.type === 'both') {
                const mkName = profile.mikrotikName || profile.name;
                const attrs = {
                    '=name=': mkName,
                    ...(rateLimitString && { '=rate-limit=': rateLimitString }),
                    ...(profile.poolName && { '=remote-address=': profile.poolName }),
                    ...(profile.addressList && { '=local-address=': profile.addressList }),
                    ...(profile.mikrotikAddressList && { '=address-list=': profile.mikrotikAddressList }),
                    ...(sessionTimeout && { '=session-timeout=': sessionTimeout }),
                    ...(profile.sharedUsers && { '=only-one=': profile.sharedUsers === 1 ? 'yes' : 'no' })
                };
                
                const existing = await conn.write('/ppp/profile/print', ['?name=' + mkName]);
                if (existing && existing.length > 0) {
                    await conn.write('/ppp/profile/set', [`=.id=${existing[0]['.id']}`, ...Object.entries(attrs).map(([k,v]) => `${k}${v}`)]);
                } else {
                    await conn.write('/ppp/profile/add', Object.entries(attrs).map(([k,v]) => `${k}${v}`));
                }
            }
            
            // Push to Hotspot
            if (profile.type === 'hotspot' || profile.type === 'both') {
                const mkName = profile.mikrotikName || profile.name;
                const attrs = {
                    '=name=': mkName,
                    ...(rateLimitString && { '=rate-limit=': rateLimitString }),
                    ...(profile.poolName && { '=address-pool=': profile.poolName }),
                    ...(profile.mikrotikAddressList && { '=address-list=': profile.mikrotikAddressList }),
                    ...(sessionTimeout && { '=session-timeout=': sessionTimeout }),
                    ...(limitBytesIn && { '=limit-bytes-in=': limitBytesIn.toString() }),
                    ...(limitBytesOut && { '=limit-bytes-out=': limitBytesOut.toString() }),
                    ...(limitBytesTotal && { '=limit-bytes-total=': limitBytesTotal.toString() }),
                    ...(profile.sharedUsers && { '=shared-users=': profile.sharedUsers.toString() })
                };
                
                const existing = await conn.write('/ip/hotspot/user/profile/print', ['?name=' + mkName]);
                if (existing && existing.length > 0) {
                    await conn.write('/ip/hotspot/user/profile/set', [`=.id=${existing[0]['.id']}`, ...Object.entries(attrs).map(([k,v]) => `${k}${v}`)]);
                } else {
                    await conn.write('/ip/hotspot/user/profile/add', Object.entries(attrs).map(([k,v]) => `${k}${v}`));
                }
            }
            
            pushResults.push({ router: router.name || router.host, success: true });
        } catch (error) {
            pushResults.push({ router: router.name || router.host, success: false, error: error.message });
        } finally {
            try { conn.close(); } catch(e) {}
        }
    }

    const failed = pushResults.filter(r => !r.success);
    if (failed.length === routersToPush.length) {
        return res.status(500).json({ error: 'Failed to push to any router', details: pushResults });
    }
    
    res.json({ message: `Pushed successfully to ${routersToPush.length - failed.length}/${routersToPush.length} routers`, data: pushResults });
});

// ==========================================
// Subscriber Activation Logic
// ==========================================
async function performMikrotikSyncInternal(subscriberData, target) {
    // Reverted: Use the 'username' (e.g., 99000110) as the primary secret identifier in MikroTik.
    const username = (subscriberData['اسم المستخدم'] || subscriberData.username || subscriberData['اسم الدخول'] || '').trim();
    const comment = (subscriberData.name || '').trim(); // Use the English name as a comment for identification.
    const password = (subscriberData['كلمة المرور'] || subscriberData.password || '').trim();
    const profileName = (subscriberData['سرعة الخط'] || subscriberData.plan || subscriberData.profile_name || '');
    const statusAr = subscriberData['حالة الحساب'] || '';
    const isDisabled = statusAr === 'موقوف' || statusAr === 'منتهي' ||
                       subscriberData.status === 'suspended' || subscriberData.status === 'expired';

    let serviceType = 'pppoe';
    let resolvedProfile = profileName || null;

    try {
        const profiles = getProfiles(); 
        const matchedProfile = profiles.find(p => p.name === profileName);
        if (matchedProfile) {
            if (matchedProfile.type === 'hotspot') serviceType = 'hotspot';
            if (matchedProfile.mikrotikName) resolvedProfile = matchedProfile.mikrotikName;
        } else if (subscriberData.subType === 'hotspot' || subscriberData['نوع الاشتراك'] === 'Hotspot') {
            serviceType = 'hotspot';
        }
    } catch (e) { }

    if (!username) throw new Error('Subscriber has no username. Please set a username in the data before syncing.');

    const config = getNetworkConfig();
    let routersToSync = [];
    if (target && target !== 'all') {
        const specificRouter = (config.routers || []).find(r => r.id === target);
        if (specificRouter) routersToSync.push(specificRouter);
        else throw new Error(`Router with id=${target} not found.`);
    } else {
        routersToSync = config.routers || [];
    }

    if (routersToSync.length === 0) throw new Error('No routers configured to sync with.');

    const syncResults = [];
    for (const router of routersToSync) {
        const routerLabel = router.name || router.host || router.id || 'Unknown';
        const conn = new RouterOSAPI({
            host: router.host,
            user: router.user,
            password: router.password || '',
            port: parseInt(router.port, 10) || 8728,
            timeout: 10
        });

        try {
            await conn.connect();
            const baseParams = [`=service=${serviceType}`, `=disabled=${isDisabled ? 'yes' : 'no'}`];
            if (password) baseParams.push(`=password=${password}`);
            if (resolvedProfile) baseParams.push(`=profile=${resolvedProfile}`);
            if (comment) baseParams.push(`=comment=${comment}`);

            const existing = await conn.write('/ppp/secret/print', [`?name=${username}`]);
            if (existing && existing.length > 0) {
                await conn.write('/ppp/secret/set', [`=.id=${existing[0]['.id']}`, ...baseParams]);
                syncResults.push({ router: routerLabel, success: true, action: 'updated', profile: resolvedProfile });
            } else {
                await conn.write('/ppp/secret/add', [`=name=${username}`, ...baseParams]);
                syncResults.push({ router: routerLabel, success: true, action: 'created', profile: resolvedProfile });
            }
        } catch (error) {
            syncResults.push({ router: routerLabel, success: false, error: error.message });
        } finally {
            try { conn.close(); } catch (e) {}
        }
    }
    return syncResults;
}

// Extension Logic
app.post('/api/subscribers/:id/extend', async (req, res) => {
    const { duration, target } = req.body; // duration: { unit: 'hours'|'days', value: number }
    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SUB-', '');

    try {
        const subDir = getSafePath(DB_PATH, 'Subscribers');
        const files = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
        let subscriberData = null;
        let foundFile = null;

        for (const file of files) {
            const content = JSON.parse(fs.readFileSync(getSafePath(subDir, file), 'utf-8'));
            if (String(content.id) === String(targetId) || `SUB-${content.id}` === targetIdStr) {
                subscriberData = content;
                foundFile = file;
                break;
            }
        }

        if (!subscriberData) return res.status(404).json({ error: 'Subscriber not found' });

        // Calculate New Expiry
        const now = new Date();
        const currentExpiry = subscriberData.expiry ? new Date(subscriberData.expiry) : now;
        
        // If currentExpiry is in the past, start from now.
        let baseDate = currentExpiry > now ? currentExpiry : now;
        const newExpiry = new Date(baseDate);

        let hoursToAdd = 0;
        if (duration.unit === 'days') {
            newExpiry.setDate(newExpiry.getDate() + duration.value);
            hoursToAdd = duration.value * 24;
        } else if (duration.unit === 'hours') {
            newExpiry.setHours(newExpiry.getHours() + duration.value);
            hoursToAdd = duration.value;
        }

        const expiryStr = newExpiry.toISOString().split('T')[0];
        const displayTime = newExpiry.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });

        subscriberData.status = 'active';
        subscriberData['حالة الحساب'] = 'active';
        subscriberData.expiry = expiryStr;
        subscriberData['تاريخ الانتهاء'] = expiryStr;
        subscriberData.expiry_time = displayTime;
        subscriberData['وقت الانتهاء'] = displayTime;
        
        // Track deduction
        subscriberData.pending_deduction_hours = (parseFloat(subscriberData.pending_deduction_hours) || 0) + hoursToAdd;

        fs.writeFileSync(getSafePath(subDir, foundFile), JSON.stringify(subscriberData, null, 2));

        // Sync to MikroTik
        let syncResults = [];
        try {
            syncResults = await performMikrotikSyncInternal(subscriberData, target || 'all');
        } catch (e) {
            console.error('[Extend] Sync failed:', e.message);
        }

        res.json({ data: { message: `Extended by ${duration.value} ${duration.unit}`, expiry: expiryStr, sync: syncResults } });
    } catch (error) {
        console.error('Extension Error:', error);
        res.status(500).json({ error: 'Failed to extend subscriber' });
    }
});

app.post('/api/subscribers/:id/activate', async (req, res) => {
    const { startDateOption } = req.body; // 'today' or 'first_of_month'
    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SUB-', '');

    try {
        const subDir = getSafePath(DB_PATH, 'Subscribers');
        if (!fs.existsSync(subDir)) return res.status(404).json({ error: 'Subscribers directory not found' });

        const files = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
        let subscriberData = null;
        let foundFile = null;

        for (const file of files) {
            try {
                const content = JSON.parse(fs.readFileSync(getSafePath(subDir, file), 'utf-8'));
                const numericMatch = file.match(/^(\d+)_/);
                const fileNum = numericMatch ? numericMatch[1] : null;

                const idMatches =
                    String(content.id) === String(targetId) ||
                    `SUB-${content.id}` === targetIdStr ||
                    (fileNum && fileNum === targetId);

                if (idMatches) {
                    subscriberData = content;
                    foundFile = file;
                    break;
                }
            } catch (e) { }
        }

        if (!subscriberData) {
            return res.status(404).json({ error: `Subscriber with ID ${targetIdStr} not found.` });
        }

        // 1. Find Profile Duration
        const profileName = (subscriberData['سرعة الخط'] || subscriberData.plan || subscriberData.profile_name || '');
        const profiles = getProfiles();
        const matchedProfile = profiles.find(p => p.name === profileName);

        if (!matchedProfile) {
            return res.status(400).json({ error: `Profile "${profileName}" not found. Cannot calculate duration.` });
        }

        // Use limitByDuration if enabled, else legacy validity
        const durationValue = matchedProfile.limitByDuration?.enabled 
            ? matchedProfile.limitByDuration.value 
            : (matchedProfile.validityValue || 1);
        const durationUnit = matchedProfile.limitByDuration?.enabled 
            ? matchedProfile.limitByDuration.unit 
            : (matchedProfile.validityUnit || 'months');

        // 2. Calculate New Expiry
        let startDate = new Date();
        if (startDateOption === 'first_of_month') {
            startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        }

        const newExpiry = new Date(startDate);
        if (durationUnit === 'months') {
            newExpiry.setMonth(newExpiry.getMonth() + durationValue);
        } else if (durationUnit === 'days') {
            newExpiry.setDate(newExpiry.getDate() + durationValue);
        } else if (durationUnit === 'hours') {
            newExpiry.setHours(newExpiry.getHours() + durationValue);
        } else {
            newExpiry.setMonth(newExpiry.getMonth() + 1); // Default 1 month
        }

        // Apply any pending deductions from previous extensions
        const deductionHours = parseFloat(subscriberData.pending_deduction_hours) || 0;
        if (deductionHours > 0) {
            newExpiry.setHours(newExpiry.getHours() - deductionHours);
            subscriberData.pending_deduction_hours = 0;
            console.log(`[Activate] Deducted ${deductionHours} hours from ${targetIdStr} due to previous extensions.`);
        }

        const expiryStr = newExpiry.toISOString().split('T')[0];
        const now = new Date();
        const displayTime = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
        const displayExpiry = `${newExpiry.getDate().toString().padStart(2, '0')}-${(newExpiry.getMonth() + 1).toString().padStart(2, '0')}-${newExpiry.getFullYear()}`;

        // 3. Update Subscriber File
        subscriberData.status = 'active';
        subscriberData['حالة الحساب'] = 'active';
        subscriberData.expiry = expiryStr;
        subscriberData['تاريخ الانتهاء'] = expiryStr;
        subscriberData.expiry_time = displayTime;
        subscriberData['وقت الانتهاء'] = displayTime;
        
        // Update Service Type based on profile
        if (matchedProfile.type) {
            subscriberData.subType = matchedProfile.type;
            subscriberData['نوع الاشتراك'] = matchedProfile.type === 'hotspot' ? 'Hotspot' : 'PPPoE';
            if (matchedProfile.type === 'both') subscriberData['نوع الاشتراك'] = 'PPPoE + Hotspot';
        }

        fs.writeFileSync(getSafePath(subDir, foundFile), JSON.stringify(subscriberData, null, 2));

        console.log(`[Activate] Subscriber ${targetIdStr} activated until ${expiryStr} | Display: ${displayExpiry}`);

        // 4. Trigger Internal Sync
        const { target } = req.body; // 'all' or specific router ID
        let syncData = [];
        try {
            syncData = await performMikrotikSyncInternal(subscriberData, target);
            console.log(`[Activate] Sync completed for ${subscriberData.username}:`, syncData);
        } catch (syncErr) {
            console.error(`[Activate] Sync failed automatically:`, syncErr.message);
        }
        
        res.json({ 
            success: true, 
            message: `تم تفعيل المشترك بنجاح حتى: ${displayExpiry}`,
            expiry: expiryStr,
            displayExpiry: displayExpiry,
            syncResult: syncData
        });

    } catch (error) {
        console.error('[Activate] Error:', error);
        res.status(500).json({ error: 'Failed to activate subscriber' });
    }
});

// ==========================================
// Subscriber ↔ MikroTik Sync Endpoint
// ==========================================
app.post('/api/subscribers/:id/sync-mikrotik', async (req, res) => {
    const { target } = req.body; // 'all' or a specific router ID
    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SUB-', '');

    console.log(`[Sync] Starting sync for subscriber ID: ${targetIdStr} | cleanId: ${targetId} | target: ${target}`);

    // Load subscriber file
    const subDir = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(subDir)) return res.status(404).json({ error: 'Subscribers directory not found' });

    const files = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
    let subscriberData = null;
    let foundFile = null;

    for (const file of files) {
        try {
            const content = JSON.parse(fs.readFileSync(getSafePath(subDir, file), 'utf-8'));
            const numericMatch = file.match(/^(\d+)_/);
            const fileNum = numericMatch ? numericMatch[1] : null;

            const idMatches =
                String(content.id) === String(targetId) ||
                `SUB-${content.id}` === targetIdStr ||
                (fileNum && fileNum === targetId);

            if (idMatches) {
                subscriberData = content;
                foundFile = file;
                break;
            }
        } catch (e) { /* skip bad files */ }
    }

    if (!subscriberData) {
        console.log(`[Sync] Subscriber not found. ID=${targetId}. Available files: ${files.slice(0,5).join(', ')}`);
        return res.status(404).json({ error: `Subscriber not found (id=${targetId}). Make sure the subscriber data exists.` });
    }

    console.log(`[Sync] Found subscriber in file: ${foundFile}`);

    try {
        const syncResults = await performMikrotikSyncInternal(subscriberData, target);
        const succeeded = syncResults.filter(r => r.success);
        
        if (succeeded.length === 0 && syncResults.length > 0) {
            return res.status(500).json({ error: 'Sync failed on all routers', details: syncResults });
        }

        res.json({
            message: `Synced successfully to ${succeeded.length}/${syncResults.length} router(s)`,
            data: syncResults
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================

// WhatsApp Engine Controller
// ==========================================
let waClient = null;
let waReady = false;
let waQr = null;
let waStatus = 'disconnected'; 

const resolveBrowserExecutable = () => {
    const candidates = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    ].filter(Boolean);

    return candidates.find(candidate => {
        try {
            return fs.existsSync(candidate);
        } catch {
            return false;
        }
    }) || null;
};

const startWhatsAppEngine = () => {
    if (waClient) {
        waClient.destroy().catch(()=>{});
    }
    waStatus = 'initializing';
    waReady = false;
    waQr = null;

    const executablePath = resolveBrowserExecutable();
    if (!executablePath) {
        waStatus = 'error';
        console.log('WhatsApp browser was not found. API will continue without WhatsApp engine.');
        return;
    }

    try {
        waClient = new Client({
            authStrategy: new LocalAuth({ dataPath: getSafePath(DB_PATH, 'System', 'whatsapp-auth') }),
            puppeteer: { 
                executablePath,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'] 
            }
        });
    } catch (error) {
        waStatus = 'error';
        console.log('Failed to create WhatsApp client:', error.message);
        return;
    }

    waClient.on('qr', (qr) => {
        waQr = qr;
        waStatus = 'qr-ready';
        qrcode.generate(qr, {small: true});
        console.log('\n======================================');
        console.log(' WHATSAPP QR CODE READY FOR SCANNING!');
        console.log('======================================\n');
    });

    waClient.on('authenticated', () => {
        waStatus = 'authenticated';
        waQr = null;
        console.log('WhatsApp Authenticated!');
    });

    waClient.on('ready', () => {
        waReady = true;
        waStatus = 'ready';
        console.log('WhatsApp Engine is READY!');
    });

    waClient.on('auth_failure', () => {
        waStatus = 'auth_failure';
        console.log('WhatsApp Authentication Failed!');
    });
    
    waClient.on('disconnected', (reason) => {
        waStatus = 'disconnected';
        waReady = false;
        console.log('WhatsApp Disconnected:', reason);
    });

    waClient.initialize().catch(e => {
        console.log("Failed to initialize WhatsApp:", e.message);
        waStatus = 'error';
    });
};

startWhatsAppEngine();

app.get('/api/whatsapp/status', (req, res) => {
    res.json({ status: waStatus, ready: waReady, qr: waQr });
});

app.post('/api/whatsapp/restart', (req, res) => {
    startWhatsAppEngine();
    res.json({ message: 'WhatsApp Engine is restarting...' });
});

app.post('/api/whatsapp/send', async (req, res) => {
  if (!waReady) {
    return res.status(503).json({ error: 'WhatsApp client is not ready. Please scan the QR code via settings.' });
  }

  const { mobile, text } = req.body;
  if (!mobile || !text) return res.status(400).json({ error: 'Missing parameters' });

  let numbers = Array.isArray(mobile) ? mobile : [mobile];
  const cleanNumbers = numbers.map(n => {
    let clean = String(n).replace(/[^0-9]/g, '');
    
    // WhatsApp strictly expects format without '00', e.g., '972...' or '970...'
    if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }
    
    // Auto-detect local Palestinian/Israeli numbers and prepend country code
    if (clean.startsWith('059') || clean.startsWith('056') || clean.startsWith('054') || clean.startsWith('052') || clean.startsWith('050') || clean.startsWith('053') || clean.startsWith('058')) {
      clean = '972' + clean.substring(1);
    } else if (clean.startsWith('59') || clean.startsWith('56') || clean.startsWith('54') || clean.startsWith('52') || clean.startsWith('50') || clean.startsWith('53') || clean.startsWith('58')) {
      clean = '972' + clean;
    }
    return clean;
  }).filter(n => n.length > 5);

  const gwConfig = getGatewaysConfig().whatsapp || { delay: 1500 };
  const delayMs = Math.max(1500, gwConfig.delay || 1500);

  let successCount = 0;
  for (const number of cleanNumbers) {
    try {
      const chatId = number + '@c.us'; 
      await waClient.sendMessage(chatId, text);
      successCount++;
      await new Promise(r => setTimeout(r, delayMs));
    } catch (err) {
      console.error(`Failed to send to ${number}:`, err.message);
    }
  }

  res.json({ data: { message: `WhatsApp sent successfully to ${successCount}/${cleanNumbers.length} numbers.` } });
});

// Endpoints

// GET Managers
app.get('/api/managers', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'System_Managers');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Managers directory not found' });
    }
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const users = files.map((file, index) => {
      const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
      const m = JSON.parse(content);
      
      const roleStr = m['الصلاحية'] || '';
      let roleKey = 'admin';
      if (roleStr === 'Manager-A' || roleStr === 'Manager') roleKey = 'sas4_manager';
      
      return {
        id: `SAS-${100 + index}`,
        name: `${m['الاسم الاول'] || ''} ${m['الاسم الثاني'] || ''}`.trim() || m['اسم الدخول'] || 'Unknown Manager',
        email: `${m['اسم الدخول'] || 'user'}@netlink.ai`,
        username: m['اسم الدخول'] || '',
        role: roleKey, // Maps to sas4_manager or admin
        permissions: ['view_dashboard', 'access_chat', 'view_subscribers'], // Basic permissions for now
        status: 'active',
        joinDate: m['تاريخ الانشاء'] || '2024-01-01',
        lastLogin: 'Never'
      };
    });

    res.json({ data: users });
  } catch (error) {
    console.error('Error fetching managers:', error);
    res.status(500).json({ error: 'Internal server error resolving managers' });
  }
});

app.get('/api/managers/raw', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'System_Managers');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Managers directory not found' });
    }

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const users = files.map((file) => {
      const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
      const m = JSON.parse(content);
      return { id: file.replace('.json', ''), ...m };
    });

    res.json({ data: users });
  } catch (error) {
    console.error('Error fetching raw managers:', error);
    res.status(500).json({ error: 'Internal server error resolving managers' });
  }
});

app.post('/api/managers/raw', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'System_Managers');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const body = req.body || {};
    const baseName = body['اسم الدخول'] || body.name || body.username || 'manager';
    const safeName = sanitizeFileName(baseName);
    
    // Simple logic for manager ID: find existing and increment
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    let maxId = 0;
    files.forEach(f => {
      const match = f.match(/^(\d+)_/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (id > maxId) maxId = id;
      }
    });

    const newId = maxId + 1;
    const fileName = `${newId}_${safeName}.json`;
    const filePath = getSafePath(dirPath, fileName);
    
    const payload = { ...body };
    delete payload.id;

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ data: { message: 'Created successfully', id: fileName.replace('.json', '') } });
  } catch (error) {
    console.error('Error creating manager:', error);
    res.status(500).json({ error: 'Failed to create manager' });
  }
});

app.put('/api/managers/raw/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'System_Managers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetId = req.params.id;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => f.replace('.json', '') === targetId || f.startsWith(`${targetId}_`));
    
    if (!targetFile) return res.status(404).json({ error: 'Manager not found' });

    const filePath = getSafePath(dirPath, targetFile);
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const body = req.body || {};
    
    const updatedContent = { ...existingContent, ...body };
    delete updatedContent.id;

    let newFileName = targetFile;
    const newName = updatedContent['اسم الدخول'] || updatedContent.username || updatedContent.name;
    if (newName) {
       const fileIdMatch = targetFile.match(/^(\d+)_/);
       const fileId = fileIdMatch ? fileIdMatch[1] : targetId.split('_')[0];
       const candidate = `${fileId}_${sanitizeFileName(newName)}.json`;
       if (candidate !== targetFile) newFileName = candidate;
    }

    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf-8');
    if (newFileName !== targetFile) {
      fs.renameSync(filePath, getSafePath(dirPath, newFileName));
    }

    res.json({ data: { message: 'Updated successfully' } });
  } catch (error) {
    console.error('Error updating manager:', error);
    res.status(500).json({ error: 'Failed to update manager' });
  }
});

app.delete('/api/managers/raw/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'System_Managers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetId = req.params.id;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => f.replace('.json', '') === targetId || f.startsWith(`${targetId}_`));

    if (!targetFile) return res.status(404).json({ error: 'Manager not found' });

    fs.unlinkSync(getSafePath(dirPath, targetFile));
    res.json({ data: { message: 'Deleted successfully' } });
  } catch (error) {
    console.error('Error deleting manager:', error);
    res.status(500).json({ error: 'Failed to delete manager' });
  }
});


// GET Subscribers
app.get('/api/subscribers', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Subscribers directory not found' });
    }
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const subscribers = files.map(file => {
      const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
      const s = JSON.parse(content);
      
      let statusKey = 'active';
      if (s['حالة الحساب'] === 'موقوف') statusKey = 'suspended';
      else if (s['حالة الحساب'] === 'منتهي') statusKey = 'expired';
      
      return {
        ...s,
        id: `SUB-${s.id || file.split('_')[0] || Math.floor(Math.random() * 1000)}`,
        name: s.name || `${s.firstname || ''} ${s.lastname || ''}`.trim() || file.replace('.json', '').split('_')[1],
        plan: s['سرعة الخط'] || s.profile_name || 'Unknown',
        status: statusKey,
        expiry: s.expiry || s['تاريخ الانتهاء'] || (s.expiration || s['تاريخ ناهية الاشتراك']) || '2026-12-31',
        expiry_time: s.expiry_time || s['وقت الانتهاء'] || 'N/A',
        balance: parseFloat(s['الرصيد المتبقي له'] || s.balance) || 0,
        phone: s.phone || s['رقم الموبايل'] || 'N/A',
        mac: s['ماك الايت بيم'] || 'N/A',
        ip: s['ip-laitpem'] || 'N/A',
        agent: s['الوكيل المسؤل'] || 'N/A'
      };
    });

    res.json({ data: subscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: 'Internal server error resolving subscribers' });
  }
});

// POST Subscriber
app.post('/api/subscribers', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    let maxId = 0;
    files.forEach(f => {
      const match = f.match(/^(\d+)_/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (id > maxId) maxId = id;
      }
    });
    
    const newId = maxId + 1;
    const body = req.body || {};
    const fName = body.firstname || body['الاسم الأول'] || body.name || 'مجهول';
    const lName = body.lastname || body['اسم العائلة'] || '';
    const fullName = `${fName} ${lName}`.trim().replace(/[\\/:*?"<>|]/g, '');
    const fileName = `${newId}_${fullName}.json`;
    
    const s = { ...body, id: newId };
    
    fs.writeFileSync(getSafePath(dirPath, fileName), JSON.stringify(s, null, 2), 'utf-8');
    res.status(201).json({ data: { message: 'Created successfully', id: `SUB-${newId}` } });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    res.status(500).json({ error: 'Failed to create subscriber' });
  }
});

// PUT Subscriber
app.put('/api/subscribers/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });
    
    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SUB-', '');
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => {
      const match = f.match(/^(\d+)_/);
      if (match && match[1] === targetId) return true;
      try {
        const content = JSON.parse(fs.readFileSync(getSafePath(dirPath, f), 'utf-8'));
        if (String(content.id) === targetId || `SUB-${content.id}` === targetIdStr) return true;
      } catch (e) {}
      return false;
    });
    
    if (!targetFile) return res.status(404).json({ error: 'Subscriber not found' });
    
    const filePath = getSafePath(dirPath, targetFile);
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const body = req.body || {};
    
    const updatedContent = {
      ...existingContent,
      ...body,
      id: existingContent.id || targetId 
    };
    
    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf-8');
    
    // File Renaming Logic if name changed
    const newNameVal = updatedContent.name || updatedContent.firstname || '';
    const newFName = updatedContent.firstname || '';
    const newLName = updatedContent.lastname || '';
    const newFullName = newNameVal ? newNameVal.replace(/[\\/:*?"<>|]/g, '') : (newFName || newLName ? `${newFName} ${newLName}`.trim().replace(/[\\/:*?"<>|]/g, '') : '');
    
    if (newFullName) {
        const fileIdMatch = targetFile.match(/^(\d+)_/);
        const fileId = fileIdMatch ? fileIdMatch[1] : updatedContent.id;
        const newFileName = `${fileId}_${newFullName}.json`;
        if (newFileName !== targetFile) {
            fs.renameSync(filePath, getSafePath(dirPath, newFileName));
        }
    }
    
    res.json({ data: { message: 'Updated successfully' } });
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ error: 'Failed to update subscriber' });
  }
});

// DELETE Subscriber
app.delete('/api/subscribers/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });
    
    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SUB-', '');
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => {
      const match = f.match(/^(\d+)_/);
      if (match && match[1] === targetId) return true;
      try {
        const content = JSON.parse(fs.readFileSync(getSafePath(dirPath, f), 'utf-8'));
        if (String(content.id) === targetId || `SUB-${content.id}` === targetIdStr) return true;
      } catch (e) {}
      return false;
    });
    
    if (!targetFile) return res.status(404).json({ error: 'Subscriber not found' });
    
    fs.unlinkSync(getSafePath(dirPath, targetFile));
    res.json({ data: { message: 'Deleted successfully' } });
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// GET Suppliers
app.get('/api/suppliers', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Suppliers');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Suppliers directory not found' });
    }
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const suppliers = files.map((file) => {
      const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
      const s = JSON.parse(content);
      return {
        id: file.replace('.json', ''),
        ...s
      };
    });
    res.json({ data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Internal server error resolving suppliers' });
  }
});

app.post('/api/suppliers', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Suppliers');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const body = req.body || {};
    const code = body['كود'];
    const name = body['اسم المورد'];
    if (!code || !name) {
      return res.status(400).json({ error: 'Missing supplier code or name' });
    }

    const safeCode = sanitizeFileName(code);
    const safeName = sanitizeFileName(name);
    if (!safeCode || !safeName) {
      return res.status(400).json({ error: 'Invalid supplier code or name' });
    }

    const fileName = `${safeCode}_${safeName}.json`;
    const filePath = getSafePath(dirPath, fileName);
    if (fs.existsSync(filePath)) {
      return res.status(409).json({ error: 'Supplier already exists' });
    }

    const payload = { ...body };
    delete payload.id;

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ data: { message: 'Created successfully', id: fileName.replace('.json', '') } });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

app.put('/api/suppliers/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Suppliers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetId = req.params.id;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => f.replace('.json', '') === targetId);
    if (!targetFile) return res.status(404).json({ error: 'Supplier not found' });

    const filePath = getSafePath(dirPath, targetFile);
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const body = req.body || {};
    const updatedContent = { ...existingContent, ...body };
    delete updatedContent.id;

    let newFileName = targetFile;
    const newCode = updatedContent['كود'];
    const newName = updatedContent['اسم المورد'];
    if (newCode && newName) {
      const candidate = `${sanitizeFileName(newCode)}_${sanitizeFileName(newName)}.json`;
      if (candidate && candidate !== targetFile) newFileName = candidate;
    }

    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf-8');
    if (newFileName !== targetFile) {
      fs.renameSync(filePath, getSafePath(dirPath, newFileName));
    }

    res.json({ data: { message: 'Updated successfully' } });
  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

app.delete('/api/suppliers/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Suppliers');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetId = req.params.id;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => f.replace('.json', '') === targetId);
    if (!targetFile) return res.status(404).json({ error: 'Supplier not found' });

    fs.unlinkSync(getSafePath(dirPath, targetFile));
    res.json({ data: { message: 'Deleted successfully' } });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({ error: 'Failed to delete supplier' });
  }
});

// GET Investors / Shareholders
app.get('/api/investors', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Investors');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: 'Investors directory not found' });
    }
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const investors = files.map((file) => {
      const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
      const inv = JSON.parse(content);
      const fileIdMatch = file.match(/^(\d+)_/);
      const stableInvestorId = fileIdMatch ? `SH-${fileIdMatch[1]}` : file.replace('.json', '');
      const totalShares = inv['كمية الأسهم الكاملة'] || 0;
      const ownedShares = inv['رصيد الأسهم'] || 0;
      const totalSharesAll = 200000; // approximation for ownership %
      const ownershipPct = totalShares > 0 ? ((ownedShares / totalSharesAll) * 100).toFixed(1) + '%' : '0%';
      return {
        id: stableInvestorId,
        name: inv['اسم المستثمر'] || file.replace('.json', ''),
        shares: ownedShares,
        ownership: ownershipPct,
        status: 'active',
        joinDate: inv['تاريخ الانضمام'] || '2024-01-01',
        investment: inv['سعر الأسهم'] || 0,
        dividends: inv['صافي الربح'] || 0,
        buyPrice: inv['سعر السهم الواحد'] || 10,
        sharePrice: inv['سعر السهم الواحد'] || 10,
        availableShares: inv['كمية الأسهم المتوفرة للبيع'] || 0,
        totalShares: totalShares,
        remainingShares: inv['باقي اسهم'] || 0
      };
    });
    res.json({ data: investors });
  } catch (error) {
    console.error('Error fetching investors:', error);
    res.status(500).json({ error: 'Internal server error resolving investors' });
  }
});

app.post('/api/investors', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Investors');
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const body = req.body || {};
    const name = body['اسم المستثمر'] || body.name;
    if (!name) {
      return res.status(400).json({ error: 'Missing investor name' });
    }

    const safeName = sanitizeFileName(name);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    let maxId = 100;
    files.forEach(f => {
      const match = f.match(/^(\d+)_/);
      if (match) {
        const id = parseInt(match[1], 10);
        if (id > maxId) maxId = id;
      }
    });
    
    const newId = maxId + 1;
    const fileName = `${newId}_${safeName}.json`;
    const filePath = getSafePath(dirPath, fileName);
    
    const payload = { ...body };
    delete payload.id;
    delete payload.ownership;
    delete payload.status;
    delete payload.totalShares;

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    res.status(201).json({ data: { message: 'Created successfully', id: `SH-${newId}` } });
  } catch (error) {
    console.error('Error creating investor:', error);
    res.status(500).json({ error: 'Failed to create investor' });
  }
});

app.put('/api/investors/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Investors');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SH-', '');
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => {
      const match = f.match(/^(\d+)_/);
      if (match && match[1] === targetId) return true;
      if (f.replace('.json', '') === targetIdStr || f.replace('.json', '') === targetId) return true;
      return false;
    });
    
    if (!targetFile) return res.status(404).json({ error: 'Investor not found' });

    const filePath = getSafePath(dirPath, targetFile);
    const existingContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const body = req.body || {};
    
    // Clean up virtual presentation fields before saving
    const updatedContent = { ...existingContent, ...body };
    delete updatedContent.id;
    delete updatedContent.ownership;
    delete updatedContent.status;
    delete updatedContent.totalShares;

    let newFileName = targetFile;
    const newName = updatedContent['اسم المستثمر'] || updatedContent.name;
    if (newName) {
       const fileIdMatch = targetFile.match(/^(\d+)_/);
       const fileId = fileIdMatch ? fileIdMatch[1] : targetId;
       const candidate = `${fileId}_${sanitizeFileName(newName)}.json`;
       if (candidate !== targetFile) newFileName = candidate;
    }

    fs.writeFileSync(filePath, JSON.stringify(updatedContent, null, 2), 'utf-8');
    if (newFileName !== targetFile) {
      fs.renameSync(filePath, getSafePath(dirPath, newFileName));
    }

    res.json({ data: { message: 'Updated successfully' } });
  } catch (error) {
    console.error('Error updating investor:', error);
    res.status(500).json({ error: 'Failed to update investor' });
  }
});

app.delete('/api/investors/:id', (req, res) => {
  try {
    const dirPath = getSafePath(DB_PATH, 'Financial', 'Investors');
    if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });

    const targetIdStr = req.params.id;
    const targetId = targetIdStr.replace('SH-', '');
    
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    const targetFile = files.find(f => {
      const match = f.match(/^(\d+)_/);
      if (match && match[1] === targetId) return true;
      if (f.replace('.json', '') === targetIdStr || f.replace('.json', '') === targetId) return true;
      return false;
    });

    if (!targetFile) return res.status(404).json({ error: 'Investor not found' });

    fs.unlinkSync(getSafePath(dirPath, targetFile));
    res.json({ data: { message: 'Deleted successfully' } });
  } catch (error) {
    console.error('Error deleting investor:', error);
    res.status(500).json({ error: 'Failed to delete investor' });
  }
});

// Generic CRUD Helper for Directors, Deputies, IPTV
const setupCrudRoutes = (resourceName, subDir, nameKey) => {
  app.get(`/api/${resourceName}`, (req, res) => {
    try {
      const dirPath = getSafePath(DB_PATH, subDir);
      if (!fs.existsSync(dirPath)) return res.json({ data: [] });
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      const data = files.map((file, index) => {
        const content = fs.readFileSync(getSafePath(dirPath, file), 'utf-8');
        return { id: file.replace('.json', ''), ...JSON.parse(content) };
      });
      res.json({ data });
    } catch (error) { res.status(500).json({ error: `Failed to fetch ${resourceName}` }); }
  });

  app.post(`/api/${resourceName}`, (req, res) => {
    try {
      const dirPath = getSafePath(DB_PATH, subDir);
      if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
      const body = req.body || {};
      const safeName = sanitizeFileName(body[nameKey] || body.name || `new_${resourceName}`);
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      let maxId = 100;
      files.forEach(f => {
        const match = f.match(/^(\d+)_/);
        if (match) {
          const id = parseInt(match[1], 10);
          if (id > maxId) maxId = id;
        }
      });
      const newId = maxId + 1;
      const fileName = `${newId}_${safeName}.json`;
      const payload = { ...body };
      delete payload.id;
      fs.writeFileSync(getSafePath(dirPath, fileName), JSON.stringify(payload, null, 2), 'utf-8');
      res.status(201).json({ data: { message: 'Created', id: `${newId}_${safeName}` } });
    } catch (error) { res.status(500).json({ error: `Failed to create ${resourceName}` }); }
  });

  app.put(`/api/${resourceName}/:id`, (req, res) => {
    try {
      const dirPath = getSafePath(DB_PATH, subDir);
      if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });
      const targetId = req.params.id;
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      const targetFile = files.find(f => f.replace('.json', '') === targetId || f.startsWith(`${targetId.split('_')[0]}_`));
      if (!targetFile) return res.status(404).json({ error: 'Not found' });
      const filePath = getSafePath(dirPath, targetFile);
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const updated = { ...existing, ...(req.body || {}) };
      delete updated.id;
      let newFileName = targetFile;
      const newName = updated[nameKey] || updated.name;
      if (newName) {
         const fileId = targetFile.match(/^(\d+)_/) ? targetFile.match(/^(\d+)_/)[1] : targetId.split('_')[0];
         newFileName = `${fileId}_${sanitizeFileName(newName)}.json`;
      }
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), 'utf-8');
      if (newFileName !== targetFile) fs.renameSync(filePath, getSafePath(dirPath, newFileName));
      res.json({ data: { message: 'Updated' } });
    } catch (error) { res.status(500).json({ error: `Failed to update ${resourceName}` }); }
  });

  app.delete(`/api/${resourceName}/:id`, (req, res) => {
    try {
      const dirPath = getSafePath(DB_PATH, subDir);
      if (!fs.existsSync(dirPath)) return res.status(404).json({ error: 'DB not found' });
      const targetId = req.params.id;
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      const targetFile = files.find(f => f.replace('.json', '') === targetId || f.startsWith(`${targetId.split('_')[0]}_`));
      if (!targetFile) return res.status(404).json({ error: 'Not found' });
      fs.unlinkSync(getSafePath(dirPath, targetFile));
      res.json({ data: { message: 'Deleted' } });
    } catch (error) { res.status(500).json({ error: `Failed to delete ${resourceName}` }); }
  });
};

setupCrudRoutes('directors', 'Staff/Directors', 'الاسم');
setupCrudRoutes('deputies', 'Staff/Deputies', 'الاسم');
setupCrudRoutes('iptv', 'System_IPTV/Subscribers', 'الاسم');

// ==========================================
// Executive AI API
// ==========================================
app.post('/api/ai/test-provider', async (req, res) => {
  try {
    const { aiSettings, providerId, language } = req.body || {};
    const result = await executeExecutiveAi({
      aiSettings,
      providerId,
      language: language === 'en' ? 'en' : 'ar',
      query: language === 'en'
        ? 'Reply with a short success message and mention the active provider.'
        : 'أجب برسالة نجاح قصيرة واذكر مزود الذكاء الاصطناعي النشط.',
      history: [],
    });

    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'AI provider test failed.' });
  }
});

app.post('/api/ai/executive-chat', async (req, res) => {
  try {
    const { message, messages, aiSettings, language } = req.body || {};
    if (!String(message || '').trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const result = await executeExecutiveAi({
      aiSettings,
      language: language === 'en' ? 'en' : 'ar',
      query: String(message).trim(),
      history: Array.isArray(messages) ? messages : [],
    });

    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: error?.message || 'Executive AI request failed.' });
  }
});

// ==========================================
// FILE MANAGER API ENDPOINTS
// ==========================================

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.get('/api/files/tree', (req, res) => {
  try {
    const targetFolder = req.query.folder || '';
    if (targetFolder.includes('..')) {
      return res.status(403).json({ error: 'Path traversal is not allowed.' });
    }
    
    const fullPath = getSafePath(DB_PATH, targetFolder);
    if (!fs.existsSync(fullPath)) {
      return res.json({ data: [] });
    }
    
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const data = items.map(item => ({
      name: item.name,
      type: item.isDirectory() ? 'folder' : 'file',
      path: path.join(targetFolder, item.name).replace(/\\/g, '/')
    }));
    
    data.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });
    
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read directory.' });
  }
});

app.get('/api/files/content', (req, res) => {
  try {
    const targetPath = req.query.path || '';
    if (targetPath.includes('..')) return res.status(403).json({ error: 'Path traversal is not allowed.' });
    
    const fullPath = getSafePath(DB_PATH, targetPath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      return res.status(404).json({ error: 'File not found.' });
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json({ data: content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file.' });
  }
});

app.post('/api/files/save', (req, res) => {
  try {
    const { targetPath, content } = req.body;
    if (!targetPath || targetPath.includes('..')) return res.status(403).json({ error: 'Invalid path.' });
    
    const fullPath = getSafePath(DB_PATH, targetPath);
    fs.writeFileSync(fullPath, content, 'utf8');
    res.json({ data: { message: 'File saved successfully.' } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file.' });
  }
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  try {
    const targetFolder = req.body.folder || '';
    if (targetFolder.includes('..')) return res.status(403).json({ error: 'Invalid path.' });
    
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    
    const finalDir = getSafePath(DB_PATH, targetFolder);
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    
    const finalPath = path.join(finalDir, req.file.originalname);
    fs.renameSync(req.file.path, finalPath);
    
    res.json({ data: { message: 'File uploaded successfully.' } });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(500).json({ error: 'Failed to upload file.' });
  }
});

app.get('/api/files/download', (req, res) => {
  try {
    const targetPath = req.query.path || '';
    if (targetPath.includes('..')) return res.status(403).json({ error: 'Invalid path.' });
    
    const fullPath = getSafePath(DB_PATH, targetPath);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) return res.status(404).json({ error: 'File not found' });
    
    res.download(fullPath);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file.' });
  }
});

// ==========================================
// SMS API
// ==========================================

app.post('/api/sms/send', async (req, res) => {
  try {
    const { mobile, text } = req.body;
    if (!mobile || !text) {
      return res.status(400).json({ error: 'Missing mobile or text parameters' });
    }
    
    let numbers = Array.isArray(mobile) ? mobile : [mobile];
    
    const cleanNumbers = numbers
      .map(n => String(n).replace(/[^0-9]/g, ''))
      .filter(n => n.length > 5);
      
    if (cleanNumbers.length === 0) {
      return res.status(400).json({ error: 'No valid mobile numbers provided' });
    }

    const config = getGatewaysConfig().sms || { url: 'http://triple-core.ps/sendbulksms.php', user_name: 'netlink', user_pass: 'Sniper.2591993', sender: 'netlink' };
    const urlStr = config.url || 'http://triple-core.ps/sendbulksms.php';
    
    let successCount = 0;
    for (const number of cleanNumbers) {
      try {
        const url = new URL(urlStr);
        url.searchParams.append('user_name', config.user_name || 'netlink');
        url.searchParams.append('user_pass', config.user_pass || 'Sniper.2591993');
        url.searchParams.append('sender', config.sender || 'netlink');
        url.searchParams.append('mobile', number);
        url.searchParams.append('type', '0');
        url.searchParams.append('text', text);
        
        await axios.get(url.toString());
        successCount++;
      } catch (err) {
        console.error(`Failed to send SMS to ${number}:`, err.message);
      }
    }
    
    res.json({ data: { message: `SMS sent successfully to ${successCount}/${cleanNumbers.length} numbers.` } });
  } catch (err) {
    console.error('SMS API Error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS.', details: err.message });
  }
});

// ==========================================
// Email API
// ==========================================

app.post('/api/email/send', async (req, res) => {
  try {
    const { emails, subject, text } = req.body;
    if (!emails || !text) {
      return res.status(400).json({ error: 'Missing emails or text parameters' });
    }
    
    let targetEmails = Array.isArray(emails) ? emails : [emails];
    targetEmails = targetEmails.filter(e => typeof e === 'string' && e.includes('@'));
    
    if (targetEmails.length === 0) {
      return res.status(400).json({ error: 'No valid email addresses provided' });
    }

    const rawConfig = getGatewaysConfig().email || {};
    const host = (rawConfig.host || 'smtp.hostinger.com').trim();
    const port = parseInt(rawConfig.port) || 465;
    const user = (rawConfig.user || 'info@netlinkps.top').trim();
    const pass = (rawConfig.pass || 'Sniper.2591993').trim();
    const from = (rawConfig.from || user).trim();
    
    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user: user,
        pass: pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    let successCount = 0;
    let lastError = '';
    for (const email of targetEmails) {
      try {
        await transporter.sendMail({
          from: `NetLink System <${from}>`,
          to: email,
          subject: subject || 'إشعار من نظام NetLink',
          text: text,
        });
        successCount++;
      } catch (err) {
        lastError = err.message || err.toString();
        console.error(`Failed to send Email to ${email}:`, err.message);
      }
    }
    
    if (successCount === 0 && targetEmails.length > 0) {
      return res.status(500).json({ error: lastError || 'Authentication failed or Hostinger SMTP rejected the connection.' });
    }
    
    res.json({ data: { message: `Email sent successfully to ${successCount}/${targetEmails.length} recipients.` } });
  } catch (err) {
    console.error('Email API Error:', err.message);
    res.status(500).json({ error: 'Failed to send Email.', details: err.message });
  }
});

// ==========================================
// BACKGROUND SERVICE: Automated Expiry Monitor
// ==========================================
async function checkSubscriberExpiries() {
    const subDir = getSafePath(DB_PATH, 'Subscribers');
    if (!fs.existsSync(subDir)) return;

    // Use current time from the local system (ADDITIONAL_METADATA context)
    // The server runs in JavaScript, so new Date() uses the system clock.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    // Generate a 12h format time string like "03:41 AM"
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const ampm = currentHours >= 12 ? 'PM' : 'AM';
    const h12 = currentHours % 12 || 12;
    const currentTimeStr = `${h12.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')} ${ampm}`;

    try {
        const files = fs.readdirSync(subDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            const filePath = getSafePath(subDir, file);
            let subData;
            try {
                subData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) { continue; }

            const status = subData['حالة الحساب'] || subData.status || '';
            if (status !== 'active' && status !== 'نشط' && status !== 'مفعل') continue;

            const expiryDate = subData.expiry || subData['تاريخ الانتهاء'];
            const expiryTime = subData.expiry_time || subData['وقت الانتهاء'];

            if (!expiryDate) continue;

            let isExpired = false;
            // Date comparison
            if (expiryDate < todayStr) {
                isExpired = true;
            } else if (expiryDate === todayStr && expiryTime) {
                // Time comparison (string based for "03:41 AM")
                // This is safe because both follow HH:MM AM/PM
                if (currentTimeStr >= expiryTime) {
                    isExpired = true;
                }
            }

            if (isExpired) {
                console.log(`[ExpiryMonitor] Subscriber ${subData.username || subData.id} HAS EXPIRED at ${expiryDate} ${expiryTime}. Disabling...`);
                
                // 1. Update JSON
                subData.status = 'expired';
                subData['حالة الحساب'] = 'منتهي';
                fs.writeFileSync(filePath, JSON.stringify(subData, null, 2));

                // 2. Sync to MikroTik (Disable)
                try {
                    await performMikrotikSyncInternal(subData, 'all');
                    console.log(`[ExpiryMonitor] MikroTik Secret disabled for ${subData.id}`);
                } catch (err) {
                    console.error(`[ExpiryMonitor] MikroTik Sync Failed for ${subData.id}:`, err.message);
                }

                // 3. Kick from MikroTik (Force Logout)
                const username = (subData['اسم المستخدم'] || subData.username || subData['اسم الدخول'] || '').trim();
                if (username) {
                    try {
                        const networkConfig = getNetworkConfig();
                        for (const router of (networkConfig.routers || [])) {
                            if (!router.host || !router.user) continue;
                            const conn = new RouterOSAPI({
                                host: router.host,
                                user: router.user,
                                password: router.password || '',
                                port: parseInt(router.port, 10) || 8728,
                                timeout: 5
                            });
                            try {
                                await conn.connect();
                                const activeItems = await conn.write('/ppp/active/print', [`?name=${username}`]);
                                if (activeItems && activeItems.length > 0) {
                                    for (const item of activeItems) {
                                        await conn.write('/ppp/active/remove', [`=.id=${item['.id']}`]);
                                    }
                                    console.log(`[ExpiryMonitor] Kicked session for ${username} from ${router.name || router.host}`);
                                }
                            } catch (error) {
                                // Silent error for individual router failures
                            } finally {
                                try { conn.close(); } catch (e) {}
                            }
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (error) {
        console.error('[ExpiryMonitor] Error in background check:', error);
    }
}

// Start background check every 60 seconds
setInterval(checkSubscriberExpiries, 60000);
console.log(`[System] Background Expiry Monitoring Service is active.`);

import { exec } from 'child_process';

// ==========================================
// System Update API
// ==========================================
app.get('/api/system/metrics', async (req, res) => {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const metricsPath = fs.existsSync(projectRoot) ? projectRoot : __dirname;
    const dbExists = fs.existsSync(DB_PATH);
    const dbPath = dbExists ? DB_PATH : getSafePath(__dirname, 'System');

    let totalBytes = 0;
    let freeBytes = 0;
    let usedBytes = 0;
    let usedPercent = 0;

    try {
      const stats = fs.statfsSync(metricsPath);
      totalBytes = Number(stats.blocks) * Number(stats.bsize);
      freeBytes = Number(stats.bavail) * Number(stats.bsize);
      usedBytes = Math.max(0, totalBytes - freeBytes);
      usedPercent = totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0;
    } catch (storageError) {
      console.error('Storage metrics failed:', storageError);
    }

    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = Math.max(0, totalMem - freeMem);

    res.json({
      data: {
        timestamp: new Date().toISOString(),
        appUptimeSec: Math.floor(process.uptime()),
        osUptimeSec: Math.floor(os.uptime()),
        nodeVersion: process.version,
        platform: `${os.platform()} ${os.release()}`,
        database: {
          exists: dbExists,
          path: dbPath,
        },
        storage: {
          path: metricsPath,
          totalBytes,
          usedBytes,
          freeBytes,
          usedPercent,
        },
        memory: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          usedPercent: totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(1)) : 0,
        },
      }
    });
  } catch (err) {
    console.error('System Metrics Error:', err);
    res.status(500).json({ error: err?.message || 'Failed to collect system metrics.' });
  }
});

app.get('/api/system/check-update', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'git_config.json');
    const localVersionPath = path.join(__dirname, 'public', 'version.json');
    
    if (!fs.existsSync(localVersionPath) || !fs.existsSync(configPath)) {
      return res.status(500).json({ error: 'Configuration or Version file missing.' });
    }

    const localData = readJsonFile(localVersionPath);
    const config = readJsonFile(configPath);

    const repoParts = config.repo_url.replace('.git', '').split('/');
    const repoOwner = repoParts[repoParts.length - 2];
    const repoName = repoParts[repoParts.length - 1];

    const remotePath = 'AI NetLink Interface/ai-net-link/public/version.json';
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${encodeURIComponent(remotePath)}?ref=main`;
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (config.pat && !config.pat.includes('your_personal_access_token_here')) {
      headers.Authorization = `token ${config.pat}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) throw new Error('Failed to fetch remote version');

    const remoteMeta = await response.json();
    if (!remoteMeta.content) throw new Error('Remote version payload is empty');

    const remoteText = Buffer.from(String(remoteMeta.content).replace(/\n/g, ''), 'base64').toString('utf-8');
    const remoteData = JSON.parse(stripBom(remoteText));

    res.json({ 
      data: {
        current: localData.version,
        latest: remoteData.version,
        hasUpdate: localData.version !== remoteData.version,
        buildDate: remoteData.buildDate || null,
        changelog: remoteData.changelog || []
      } 
    });

  } catch (err) { 
    console.error('Update Check Error:', err);
    res.status(500).json({ error: err?.message || 'Update check failed.' }); 
  }
});

app.post('/api/system/update', async (req, res) => {
  const updateScript = path.join(__dirname, 'update_script.sh');
  const projectRoot = path.resolve(__dirname, '../../');
  if (!fs.existsSync(updateScript)) return res.status(500).json({ error: 'Update script not found' });

  try {
    const updateLogPath = path.join(projectRoot, 'update-run.log');
    const command = `nohup /bin/bash "${updateScript}" >> "${updateLogPath}" 2>&1 &`;

    exec(command, { cwd: projectRoot }, (err, stdout, stderr) => {
      if (err) {
        console.error('Update script start failed:', stderr || stdout || err.message);
        return res.status(500).json({ error: (stderr || stdout || err.message || 'Update execution failed.').trim() });
      }
      return res.json({ message: 'Update started successfully! System will reboot.' });
    });
  } catch (err) {
    console.error('Update script start failed:', err);
    return res.status(500).json({ error: err?.message || 'Update execution failed.' });
  }
});

app.post('/api/system/publish', async (req, res) => {
  try {
    const configPath = path.join(__dirname, 'git_config.json');
    const versionPath = path.join(__dirname, 'public', 'version.json');
    if (!fs.existsSync(configPath)) return res.status(500).json({ error: 'Git configuration missing.' });
    if (!fs.existsSync(versionPath)) return res.status(500).json({ error: 'Version file missing.' });

    const config = readJsonFile(configPath);
    const versionData = readJsonFile(versionPath);
    const body = req.body || {};
    const pin = String(body.pin || '').trim();
    const version = String(versionData.version || '').trim();
    const buildDate = String(versionData.buildDate || new Date().toISOString().split('T')[0]).trim();
    const changelog = Array.isArray(versionData.changelog)
      ? versionData.changelog.map(item => String(item || '').trim()).filter(Boolean)
      : [];

    if (pin !== GITHUB_PUBLISH_PIN) {
      return res.status(403).json({ error: 'Invalid publish PIN.' });
    }

    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
      return res.status(400).json({ error: 'A valid semantic version is required. Example: 1.0.4' });
    }

    if (changelog.length === 0) {
      return res.status(400).json({ error: 'At least one changelog item is required.' });
    }
    
    // Project Root (where .git is)
    const projectRoot = path.resolve(__dirname, '../../');
    const commitMessage = String(body.commitMessage || `release: v${version}`).trim();

    if (!config.repo_url || !config.pat || config.pat.includes('your_personal_access_token_here')) {
      return res.status(500).json({ error: 'GitHub token is missing in git_config.json on the server.' });
    }

    // Commands to run in sequence
    // Using simple auth in URL from config
    const remoteUrl = config.repo_url.replace('https://', `https://${config.pat}@`);
    
    const commands = [
      `git config user.email "admin@aljabareen.com"`,
      `git config user.name "NetLink System AutoSync"`,
      `git config pull.rebase false`,
      `git add -A .`,
      `git reset -q -- "NetLink Enterprise DB" "AI NetLink Interface/ai-net-link/git_config.json" "AI NetLink Interface/ai-net-link/.wwebjs_cache" || true`,
      `git commit -m "${commitMessage.replace(/"/g, '\\"')}" || echo "No changes to commit"`,
      `git push "${remoteUrl}" HEAD:main`
    ].join(' && ');

    exec(commands, { cwd: projectRoot }, (err, stdout, stderr) => {
      if (err) {
        console.error('Git Publish Error:', stderr || stdout);
        return res.status(500).json({ error: (stderr || stdout || 'Publish failed.').trim() });
      }
      res.json({ message: 'Release published to GitHub successfully!', data: { version, buildDate, changelog } });
    });

  } catch (err) { res.status(500).json({ error: 'Server error during publish.' }); }
});

app.listen(PORT, () => {
  console.log(`\n===========================================`);
  console.log(`🚀 NetLink API Server is running on \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log(`📂 Database Path connected: \x1b[33m${DB_PATH}\x1b[0m`);
  logDirectoryStatus('Subscribers', 'Subscribers');
  logDirectoryStatus('Managers', 'Financial', 'System_Managers');
  logDirectoryStatus('Suppliers', 'Financial', 'Suppliers');
  logDirectoryStatus('Investors', 'Financial', 'Investors');
  console.log(`===========================================\n`);
});
