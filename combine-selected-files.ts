import { readFile, writeFile, stat, readdir } from 'fs/promises';
import { join, relative } from 'path';

// Specify file or folder paths to combine:
const filePaths: string[] = [
  'src/bootstrap',
  'src/db/base',
  'src/db/configs',
  'src/db/plugins',
  'src/db/redis',
  'src/db/common-schemas.ts',
  'src/db/connect.ts',
  'src/db/models/account.ts',
  'src/db/models/nige-nest/nest-account.ts',
  'src/db/models/user.ts',
  'src/db/models/auth-provider.ts',
  'src/db/models/account-role.ts',
  'src/db/models/twitter-token.ts',
  'src/db/models/role.ts',
  'src/middlewares/auth-cookie.ts',
  'src/middlewares/authorize.ts',
  'src/routes/auth/index.ts',
  'src/routes/index.ts',
  'src/controllers/auth/index.ts',
  'src/controllers/auth/user.controller.ts',
  'src/services/auth/auth.service.ts',
  'src/services/auth/user-status.service.ts',
  'src/constants/roles.ts',
  'src/constants/permissions.ts',
];

const outputFile = 'combined.txt';

/**
 * Recursively collects all file paths under a directory.
 */
async function getFilesRecursive(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await getFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function combineSelectedFiles() {
  try {
    // Expand filePaths into actual file list, skipping missing paths
    const allPaths: string[] = [];
    for (const p of filePaths) {
      try {
        const info = await stat(p);
        if (info.isFile()) {
          allPaths.push(p);
        } else if (info.isDirectory()) {
          const nested = await getFilesRecursive(p);
          allPaths.push(...nested);
        }
      } catch {
        // skip if path does not exist or is inaccessible
      }
    }

    // Read and format contents
    const fileContents = await Promise.all(
      allPaths.map(async (file) => {
        try {
          const content = await readFile(file, 'utf8');
          const relPath = relative(process.cwd(), file);
          return `\n${relPath}\n${'-'.repeat(relPath.length)}\n${content}`;
        } catch {
          return '';
        }
      })
    );

    const finalContent = fileContents.filter(Boolean).join('\n');
    await writeFile(outputFile, finalContent, 'utf8');
    console.log(`Combined content written to ${outputFile}`);
  } catch (error) {
    console.error('Error combining selected files:', error);
  }
}

combineSelectedFiles();
