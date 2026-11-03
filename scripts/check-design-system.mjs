import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@vue/compiler-sfc';
import ts from 'typescript';
import postcss from 'postcss';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
  ? entry.name === '__tests__' ? [] : walk(path.join(dir, entry.name))
  : [path.join(dir, entry.name)]);
const files = walk(src).filter(file => /\.(vue|css|ts)$/.test(file) && !file.endsWith('.test.ts'));
const definitions = new Set();
const references = [];
const errors = [];
function checkTextRoles(css, file) {
  css.walkDecls('color', decl => {
    if (/var\(--color-data-/.test(decl.value)) errors.push(`${path.relative(root, file)}: couleur de données employée comme couleur de texte`);
  });
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/['"]?(--[\w-]+)['"]?\s*:/g)) definitions.add(match[1]);
  for (const match of source.matchAll(/var\(\s*(--[\w-]+)(?=\s*[,\)])/g)) references.push({ file, name: match[1], line: source.slice(0, match.index).split('\n').length });
  if (file.endsWith('.vue')) {
    const result = parse(source);
    errors.push(...result.errors.map(error => `${path.relative(root, file)}: ${error.message}`));
    for (const block of result.descriptor.styles) if (!block.src) {
      const css = postcss.parse(block.content, { from: file });
      checkTextRoles(css, file);
    }
  }
  if (file.endsWith('.css')) checkTextRoles(postcss.parse(source, { from: file }), file);
}
for (const reference of references) if (!definitions.has(reference.name)) errors.push(`${path.relative(root, reference.file)}:${reference.line}: token inconnu ${reference.name}`);

const palette = postcss.parse(fs.readFileSync(path.join(src, 'styles/primitives.css'), 'utf8'));
const roles = postcss.parse(fs.readFileSync(path.join(src, 'styles/variables.css'), 'utf8'));
function tokensFor(theme) {
  const tokens = {};
  for (const css of [palette, roles]) css.walkRules(rule => {
    if (rule.selector !== ':root' && !(theme === 'dark' && rule.selector === '[data-theme="dark"]')) return;
    const local = new Set();
    rule.walkDecls(decl => {
      if (!decl.prop.startsWith('--')) return;
      if (local.has(decl.prop)) errors.push(`Définition répétée de ${decl.prop} dans ${rule.selector}`);
      local.add(decl.prop); tokens[decl.prop] = decl.value;
    });
  });
  return name => {
    let value = tokens[name];
    for (let i = 0; i < 12 && value?.includes('var('); i++) value = value.replace(/var\((--[\w-]+)\)/g, (_, token) => tokens[token] ?? '');
    return value;
  };
}
function luminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Couleur non résolue : ${hex}`);
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(a, b) { const values = [luminance(a), luminance(b)].sort((x, y) => x - y); return (values[1] + .05) / (values[0] + .05); }
const pairs = [
  ...['primary', 'secondary', 'link'].flatMap(role => ['default', 'raised', 'subtle'].map(surface => [`--color-text-${role}`, `--color-surface-${surface}`, 4.5])),
  ...['default', 'hover', 'pressed'].map(state => ['--color-text-on-accent', `--color-action-primary-${state}`, 4.5]),
  ...['default', 'hover'].map(state => ['--color-text-on-accent', `--color-action-danger-${state}`, 4.5]),
  ['--color-text-on-selected', '--color-interaction-selected', 4.5],
  ...['period', 'period-root'].map(period => ['--color-text-on-period', `--color-data-${period}`, 4.5]),
  ...['success', 'warning', 'error'].map(status => [`--color-status-${status}-foreground`, `--color-status-${status}-background`, 4.5]),
  ['--color-wikidata-label-on-selected', '--color-interaction-selected', 4.5],
  ['--color-switch-thumb', '--color-switch-track-off', 3],
  ['--color-switch-thumb', '--color-primary', 3],
  ...['blue', 'green', 'amber', 'red', 'violet', 'pink', 'teal', 'slate'].map(color => ['--color-avatar-foreground', `--color-avatar-${color}`, 4.5]),
];
let minimum = Infinity;
for (const theme of ['light', 'dark']) {
  const value = tokensFor(theme);
  for (const [text, background, target] of pairs) {
    const ratio = contrast(value(text), value(background));
    minimum = Math.min(minimum, ratio);
    if (ratio < target) errors.push(`${theme}: ${text} / ${background} = ${ratio.toFixed(2)}:1 (< ${target}:1)`);
  }
}

// Include lazy routes and component imports, so an isolated demo is not mistaken for dead UI.
const reachable = new Set();
function visit(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  if (!/\.(vue|ts|js)$/.test(file)) return;
  let source = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.vue')) { const { descriptor } = parse(source); source = [descriptor.script?.content, descriptor.scriptSetup?.content].filter(Boolean).join('\n'); }
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  function scan(node) {
    const specifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier
      : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword ? node.arguments[0] : undefined;
    if (specifier && ts.isStringLiteral(specifier) && (specifier.text.startsWith('.') || specifier.text.startsWith('@/'))) {
      const target = specifier.text.startsWith('@/') ? path.join(src, specifier.text.slice(2)) : path.resolve(path.dirname(file), specifier.text);
      const resolved = [target, `${target}.ts`, `${target}.vue`, path.join(target, 'index.ts')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
      if (resolved) visit(resolved);
    }
    ts.forEachChild(node, scan);
  }
  scan(ast);
}
visit(path.join(src, 'main.ts'));
for (const file of files.filter(file => /\.(vue|ts)$/.test(file) && !file.endsWith('.d.ts') && !file.includes(`${path.sep}testFixtures${path.sep}`))) if (!reachable.has(file)) errors.push(`Source non reliée à l’application : ${path.relative(root, file)}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Design system : références CSS valides, ${pairs.length * 2} contrastes validés dans les deux thèmes, aucune source Vue/TypeScript isolée (minimum ${minimum.toFixed(2)}:1).`);
