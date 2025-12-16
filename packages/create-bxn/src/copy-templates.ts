import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function copyTemplate(
  templatePath: string,
  targetPath: string,
  replacements: Record<string, string>,
): Promise<void> {
  // Create the target directory if it doesn't exist
  await mkdir(targetPath, { recursive: true });

  const entries = await readdir(templatePath, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(templatePath, entry.name);
    const destPath = join(targetPath, entry.name);

    if (entry.isDirectory()) {
      await mkdir(destPath, { recursive: true });
      await copyTemplate(srcPath, destPath, replacements);
    } else {
      let content = await readFile(srcPath, 'utf-8');

      // Replace placeholders
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(key, value);
      }

      await writeFile(destPath, content);
    }
  }
}
