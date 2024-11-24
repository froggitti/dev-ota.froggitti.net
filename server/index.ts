//////////////////////////////////////////////////////////////
//                                                          //
//  Created by lovelyjacob.com - 11/23/2024                 //
//  https://github.com/jacobhumston/swags-website-template  //
//                                                          //
//////////////////////////////////////////////////////////////

import { Hono } from 'hono';
import { invalidDomainRedirect, notFoundRedirect, port } from './config';
import { createError } from './error';
import { domains } from './domains';
import fs from 'node:fs';
import * as nodePath from 'node:path';
import mime from 'mime-types';

const server = new Hono({
    getPath: (req) => '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
});

server.use((context, next) => {
    const url = new URL(context.req.url);
    const providedPath = nodePath
        .normalize(url.pathname)
        .replace(/^(\.\.[\/\\])+/, '')
        .replaceAll('\\', '/');
    const domain = domains.find((domain) => domain === context.req.path.split('/')[1]);

    if (!domain) {
        if (invalidDomainRedirect) {
            return context.redirect(invalidDomainRedirect) as any;
        } else {
            return context.json(createError(400, 'Invalid domain name.')) as any;
        }
    }

    let path = providedPath.replace(domain, '').replaceAll(/\/{2,}/g, '/');

    if (path.endsWith('.html')) return context.redirect(path.replace('.html', '')) as any;
    if (path.endsWith('/')) path += 'index.html';
    if (!path.includes('.')) path += '.html';

    const fileExists = fs.existsSync(nodePath.join(`./client/${domain}/`, path));
    const backupFileExists = fs.existsSync(nodePath.join('./client/__all/', path));

    if (!fileExists && !backupFileExists) {
        context.req.path = context.req.path.replace(`${domain}/`, '');
        return next();
    }

    const filePath = fileExists ? nodePath.join(`./client/${domain}/`, path) : nodePath.join('./client/__all/', path);
    const fileExt = nodePath.extname(filePath);
    const file = fs.readFileSync(filePath);

    context.header('Content-Type', mime.lookup(fileExt) || 'application/octet-stream');
    return context.body(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as any);
});

server.use((context, next) => {
    const path = context.req.path;
    if (path === '/@/domains') {
        return context.json({ domains: domains }) as any;
    } else {
        return next();
    }
});

server.notFound((context) => {
    if (context.req.query('@404')) {
        return context.json(
            createError(404, 'Server attempted to redirect to a 404 page, however the 404 page also returned a 404.'),
            404
        );
    }
    return context.redirect(notFoundRedirect + '?@404=true');
});

export default {
    fetch: server.fetch,
    port,
};
