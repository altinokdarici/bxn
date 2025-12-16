export async function getLatestVersion(packageName: string): Promise<string> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
    if (!response.ok) {
      throw new Error(`Failed to fetch version for ${packageName}`);
    }
    const data = await response.json();
    return `^${data.version}`;
  } catch {
    console.warn(`Warning: Could not fetch latest version for ${packageName}, using 'latest'`);
    return 'latest';
  }
}
