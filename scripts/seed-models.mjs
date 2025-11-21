import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🌱 Seeding AI models...\n');

try {
  // Run the seed script using tsx
  execSync('tsx server/seedZenityxModels.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ Models seeded successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Error seeding models:', error.message);
  process.exit(1);
}
