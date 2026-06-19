import fs from 'fs';
import { execSync } from 'child_process';

console.log('[build-edge-engine] Beginning edge engine compilation...');

try {
  // 1. Compile index_edge.ts into the edge bundle using esbuild
  const runCmd = 'npx esbuild src/lib/finance-engine/index_edge.ts --bundle --platform=neutral --format=esm --external:@supabase/supabase-js --banner:js="// AUTO-GENERATED FILE.\\n// Do not edit manually.\\n// Regenerate after any Finance Engine change.\\n" --outfile=supabase/functions/_shared/financeEngine.ts';
  execSync(runCmd, { stdio: 'inherit' });

  // 2. Perform modern Supabase SDK CDN injection so it executes cleanly in Deno
  const filePath = 'supabase/functions/_shared/financeEngine.ts';
  let bundle = fs.readFileSync(filePath, 'utf8');
  bundle = bundle.replace(/['"]@supabase\/supabase-js['"]/g, '"https://esm.sh/@supabase/supabase-js@2.39.8"');
  fs.writeFileSync(filePath, bundle, 'utf8');

  console.log('[build-edge-engine] Successfully compiled and injected Deno/ESM imports.');
} catch (err) {
  console.error('[build-edge-engine] Error compiling engine bundle:', err);
  process.exit(1);
}
