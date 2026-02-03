import fs from 'fs';
import path from 'path';

const root = process.cwd();
const translationsPath = path.join(root, 'src', 'lib', 'translations.ts');
const outSeedPath = path.join(root, 'supabase', 'seed_site_content_overrides.sql');
const outRegistrySeedPath = path.join(root, 'supabase', 'seed_content_registry.sql');

const raw = fs.readFileSync(translationsPath, 'utf8');
const marker = 'export const translations';
const markerIndex = raw.indexOf(marker);
if (markerIndex === -1) {
  throw new Error('Could not find translations export in translations.ts');
}

const braceStart = raw.indexOf('{', markerIndex);
if (braceStart === -1) {
  throw new Error('Could not find opening brace for translations object');
}

let depth = 0;
let braceEnd = -1;
for (let i = braceStart; i < raw.length; i++) {
  const ch = raw[i];
  if (ch === '{') depth += 1;
  if (ch === '}') {
    depth -= 1;
    if (depth === 0) {
      braceEnd = i;
      break;
    }
  }
}

if (braceEnd === -1) {
  throw new Error('Could not find closing brace for translations object');
}

const objectText = raw.slice(braceStart, braceEnd + 1);
const translations = new Function(`return ${objectText};`)();

const languages = ['sk', 'en', 'de', 'cn'];

const isPlainObject = (val) => val && typeof val === 'object' && !Array.isArray(val);

const flattenKeys = (obj, prefix = '', keys = []) => {
  if (typeof obj === 'string') {
    keys.push(prefix);
    return keys;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      flattenKeys(item, nextPrefix, keys);
    });
    return keys;
  }
  if (isPlainObject(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      flattenKeys(value, nextPrefix, keys);
    }
  }
  return keys;
};

const getByPath = (obj, pathKey) => {
  const parts = pathKey.split('.');
  let ref = obj;
  for (const part of parts) {
    if (ref === undefined || ref === null) return null;
    const index = Number.isFinite(Number(part)) ? Number(part) : null;
    if (Array.isArray(ref) && index !== null) {
      ref = ref[index];
    } else {
      ref = ref[part];
    }
  }
  return typeof ref === 'string' ? ref : null;
};

const humanizeSegment = (segment) => {
  if (Number.isFinite(Number(segment))) {
    return `Item ${Number(segment) + 1}`;
  }
  const spaced = segment
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const sqlString = (value) => {
  if (value === null || value === undefined) return 'NULL';
  const escaped = String(value).replace(/'/g, "''");
  return `'${escaped}'`;
};

const keys = flattenKeys(translations.sk || {});
const uniqueKeys = Array.from(new Set(keys)).sort();

const registryRows = [];
const siteRows = [];

uniqueKeys.forEach((key, index) => {
  const values = {
    sk: getByPath(translations.sk, key),
    en: getByPath(translations.en, key),
    de: getByPath(translations.de, key),
    cn: getByPath(translations.cn, key),
  };

  if (values.sk === null && values.en === null && values.de === null && values.cn === null) return;

  const section = key.split('.')[0] || 'general';
  const label = key.split('.').map(humanizeSegment).join(' / ');
  const sample = values.en || values.sk || values.de || values.cn || '';
  const looksLikeImage = /(\.png|\.jpg|\.jpeg|\.webp|\.gif|\.svg)$/i.test(sample);
  const keyIsImage = key.includes('.images.') || key.endsWith('.image') || key.endsWith('.imageUrl') || key.endsWith('.image_url');
  const contentType = (looksLikeImage || keyIsImage)
    ? 'image'
    : (sample.length > 120 || sample.includes('\n') ? 'textarea' : 'text');

  registryRows.push(`(${sqlString(key)}, ${sqlString(section)}, ${sqlString(label)}, ${sqlString(contentType)}, ${sqlString(label)}, ${index})`);

  siteRows.push(
    `(${sqlString(key)}, ${sqlString(values.sk)}, ${sqlString(values.en)}, ${sqlString(values.de)}, ${sqlString(values.cn)}, ${sqlString(contentType)}, ${sqlString(section)}, ${sqlString(label)})`
  );
});

const seedHeader = `-- Auto-generated from src/lib/translations.ts\n-- Run in Supabase SQL editor\n\n`;

const siteSeed = `${seedHeader}
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS value_de text;
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS value_cn text;
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'text';
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS section text DEFAULT 'general';
ALTER TABLE public.site_content ADD COLUMN IF NOT EXISTS description text;
\nINSERT INTO public.site_content (key, value_sk, value_en, value_de, value_cn, content_type, section, description)
VALUES
${siteRows.join(',\n')}
ON CONFLICT (key) DO UPDATE SET
  value_sk = EXCLUDED.value_sk,
  value_en = EXCLUDED.value_en,
  value_de = EXCLUDED.value_de,
  value_cn = EXCLUDED.value_cn,
  content_type = EXCLUDED.content_type,
  section = EXCLUDED.section,
  description = EXCLUDED.description;
`;

const registrySeed = `${seedHeader}
INSERT INTO public.content_registry (key, section, label, content_type, description, sort_order)
VALUES
${registryRows.join(',\n')}
ON CONFLICT (key) DO UPDATE SET
  section = EXCLUDED.section,
  label = EXCLUDED.label,
  content_type = EXCLUDED.content_type,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
`;

fs.writeFileSync(outSeedPath, siteSeed, 'utf8');
fs.writeFileSync(outRegistrySeedPath, registrySeed, 'utf8');

console.log(`Generated:\n- ${outSeedPath}\n- ${outRegistrySeedPath}`);
