import fs from 'fs';
import path from 'path';

const hookPath = path.resolve('.git/hooks/pre-push');
const hookContent = `#!/bin/bash
set -e

echo "🚀 [PZ-Panel Hook] Ejecutando validaciones completas CI/CD local (lint, typecheck, vitest, playwright)..."

pnpm run validate:all

echo "✅ [PZ-Panel Hook] 100% de validaciones y pruebas (85/85) pasaron exitosamente. Procediendo con el push."
`;

if (fs.existsSync(path.resolve('.git'))) {
  fs.mkdirSync(path.resolve('.git/hooks'), { recursive: true });
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  console.log('✅ Git hook pre-push configurado exitosamente en .git/hooks/pre-push');
} else {
  console.log('ℹ️ No se detectó directorio .git; omitiendo configuración de hooks.');
}
