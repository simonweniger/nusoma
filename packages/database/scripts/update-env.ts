import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const branch = process.argv[2];

if (!branch) {
    console.error('Please provide a branch name.');
    process.exit(1);
}

try {
    console.log(`Fetching connection string for branch '${branch}'...`);
    const connectionString = execSync(`neonctl connection-string ${branch}`, { encoding: 'utf-8' }).trim();

    if (!connectionString) {
        console.error('Could not retrieve connection string.');
        process.exit(1);
    }

    console.log(`Connection string retrieved.`);

    const filesToUpdate = [
        path.resolve(__dirname, '../.env'),
        path.resolve(__dirname, '../../../apps/dashboard/.env'),
    ];

    const updateEnvFile = (filePath: string, url: string) => {
        let content = '';

        if (fs.existsSync(filePath)) {
            content = fs.readFileSync(filePath, 'utf-8');

            if (content.includes('DATABASE_URL=')) {
                // Replace existing line
                content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`);
            } else {
                // Append to end
                if (content.length > 0 && !content.endsWith('\n')) {
                    content += '\n';
                }
                content += `DATABASE_URL=${url}\n`;
            }

            fs.writeFileSync(filePath, content);
            console.log(`Updated ${filePath}`);
        } else {
            console.warn(`File not found: ${filePath}`);
        }
    };

    filesToUpdate.forEach(file => updateEnvFile(file, connectionString));
    console.log('Environment variables updated successfully.');

} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
