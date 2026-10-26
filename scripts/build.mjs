import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = JSON.parse(read('content/levels.json'));
// Modules are concatenated in dependency order into one classic script.
const MODULES = ['src/engine.mjs', 'src/world.mjs', 'src/epilogue.mjs', 'src/app.mjs'];
const IMPORT_RE = /^import\s*\{[^}]*\}\s*from\s*'\.\/[\w-]+\.mjs';\s*$/gm;
const EXPORT_RE = /^export\s*\{[\s\S]*?\};\s*$/m;
const parts = MODULES.map(file => {
  const source = read(file).replace(IMPORT_RE, '').replace(EXPORT_RE, '');
  if (/^\s*(import|export)\b/m.test(source)) throw Error(`Failed to inline module syntax in ${file}`);
  return `// ---- ${file} ----\n${source}`;
});
const css = read('src/styles.css').replace(/<\/style>/gi, '<\\/style>');
const dataScript = `const GAME_DATA = ${JSON.stringify(json).replace(/</g, '\\u003c')};`;
const bgm = fs.readFileSync(path.join(root, 'audio/tired_royal_march.mp3')).toString('base64');
const js = `${dataScript}\nconst BGM_DATA_URI = 'data:audio/mpeg;base64,${bgm}';\n${parts.join('\n')}`.replace(/<\/script>/gi, '<\\/script>');
// Parse-only check: duplicate top-level names across modules would break the single file.
try { new Function(js); } catch (error) { throw Error(`Bundled script does not parse: ${error.message}`); }
const html = read('src/shell.html').replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
fs.writeFileSync(path.join(root, '國王的遺囑_可玩版.html'), html);
console.log(`Built standalone game: dist/index.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
