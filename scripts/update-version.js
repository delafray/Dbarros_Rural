import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const versionFilePath = path.join(__dirname, '../version.ts');

try {
    if (!fs.existsSync(versionFilePath)) {
        console.error('version.ts not found!');
        process.exit(1);
    }

    let content = fs.readFileSync(versionFilePath, 'utf8');
    // Match format: export const APP_VERSION = '0.YYYY.MM.XXXX';
    const match = content.match(/APP_VERSION = '(\d+)\.(\d+)\.(\d+)\.(\d+)'/);

    if (match) {
        let [fullMatch, major, year, month, build] = match;

        const now = new Date();
        const currentYear = String(now.getFullYear());
        // getMonth() is 0-indexed
        const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

        if (year !== currentYear || month !== currentMonth) {
            // Month changed, reset build
            year = currentYear;
            month = currentMonth;
            build = '0001';
        } else {
            // Same month, increment build
            build = String(parseInt(build, 10) + 1).padStart(4, '0');
        }

        const newVersion = `${major}.${year}.${month}.${build}`;
        // Replace only the version string
        const newContent = content.replace(fullMatch, `APP_VERSION = '${newVersion}'`);

        fs.writeFileSync(versionFilePath, newContent);
        console.log(`Version updated to ${newVersion}`);

        // Update package.json
        const packageJsonPath = path.join(__dirname, '../package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            packageJson.version = newVersion;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`package.json updated to ${newVersion}`);
        }

    } else {
        console.error('Could not parse version string in version.ts. Expected format: export const APP_VERSION = \'0.YYYY.MM.XXXX\';');
        process.exit(1);
    }
} catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
}
