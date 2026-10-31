// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const files = (folder: string) => readdirSync(root + folder).filter(name => name.endsWith('.ts')).map(name => `${folder}/${name}`);
it('keeps HTTP, SQL and pure business rules in their own layers', () => {
  const problems: string[] = [];
  for (const file of ['api/routes.ts', ...files('services'), ...files('repositories'), ...files('domain'), ...files('shared')]) {
    const source = ts.createSourceFile(file, readFileSync(`${root}${file}`, 'utf8'), ts.ScriptTarget.Latest, true);
    function inspect(node: ts.Node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const path = node.moduleSpecifier.text;
        if (file === 'api/routes.ts' && /repositories|database|transaction/.test(path)) problems.push(`${file}: direct database import`);
        if (file.startsWith('services/') && path === 'express') problems.push(`${file}: HTTP dependency`);
        if (file.startsWith('repositories/') && /database|dotenv|express|services\/|auth\//.test(path)) problems.push(`${file}: implicit connection or upper-layer dependency`);
        if ((file.startsWith('domain/') || file.startsWith('shared/')) && /api\/|repositories\/|services\/|express|pg$/.test(path)) problems.push(`${file}: impure domain dependency`);
      }
      if (!file.startsWith('repositories/') && (ts.isStringLiteralLike(node) || ts.isTemplateHead(node))) {
        if (/^\s*(SELECT|INSERT|UPDATE|DELETE|WITH RECURSIVE|LOCK TABLE|SET LOCAL|BEGIN|COMMIT|ROLLBACK)\b/i.test(node.text)) problems.push(`${file}: SQL outside repository`);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(source);
  }
  expect(problems).toEqual([]);
});
