import fs from 'node:fs';

/**
 * List of all domains that are served by the server.
 */
export const domains = fs.readdirSync('./client').filter((folder) => {
    if (fs.statSync(`./client/${folder}`).isDirectory()) {
        if (folder.startsWith('__')) return false;
        return true;
    } else {
        console.warn(`Warning: ${folder} is not a directory and will not be served.`);
        return false;
    }
});
