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
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import api from './api';

const server = new Hono({
    getPath: (req) => '/' + req.headers.get('host') + req.url.replace(/^https?:\/\/[^/]+(\/[^?]*)/, '$1'),
});

server.use(async (context, next) => {
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

    const query = url.searchParams.size > 0 ? '?' + url.searchParams.toString() : '';

    if (path.endsWith('.html')) return context.redirect(path.replace('.html', '') + query) as any;
    if (path.endsWith('.php')) return context.redirect(path.replace('.php', '') + query) as any;
    if (path.endsWith('/')) path += 'index';

    let backupPath = path;

    let fileExists = fs.existsSync(nodePath.join(`./client/${domain}/`, path));
    let backupFileExists = fs.existsSync(nodePath.join('./client/__all/', backupPath));

    if (!fileExists || fs.statSync(nodePath.join(`./client/${domain}/`, path)).isDirectory()) {
        path = path += '.html';
        fileExists = fs.existsSync(nodePath.join(`./client/${domain}/`, path));
        if (!fileExists) {
            path = path.replace('.html', '.php');
            fileExists = fs.existsSync(nodePath.join(`./client/${domain}/`, path));
        }
    }

    if (!backupFileExists || fs.statSync(nodePath.join('./client/__all/', backupPath)).isDirectory()) {
        backupPath += '.html';
        backupFileExists = fs.existsSync(nodePath.join('./client/__all/', backupPath));
        if (!backupFileExists) {
            backupPath = path.replace('.html', '.php');
            backupFileExists = fs.existsSync(nodePath.join('./client/__all/', backupPath));
        }
    }

    if (!fileExists && !backupFileExists) {
        context.req.path = context.req.path.replace(`${domain}/`, '');
        return next();
    }

    const filePath = fileExists
        ? nodePath.join(`./client/${domain}/`, path)
        : nodePath.join('./client/__all/', backupPath);

    if (fs.statSync(filePath).isDirectory()) {
        return context.redirect(url.pathname + '/' + query) as any;
    }

    const fileExt = nodePath.extname(filePath);
    let file = fs.readFileSync(filePath);

    if (fileExt === '.php') {
        let phpQuerySet = '';
        url.searchParams.forEach((value, key) => {
            const sanitizedKey = key.replace(/[^a-zA-Z0-9_ .\/]/g, '');
            const sanitizedValue = value.replace(/[^a-zA-Z0-9_ .\/]/g, '');
            phpQuerySet += ` $_GET['${sanitizedKey}'] = '${sanitizedValue}';`;
        });
        try {
            file = execFileSync('./server/packages/php/php.exe', {
                input: `<?php $_SERVER['PHP_SELF'] = '${filePath}'; chdir('${nodePath.dirname(filePath)}'); ${phpQuerySet} ?> ${file.toString()}`,
            });
        } catch (error) {
            console.error(error);
            return context.json(createError(500, 'PHP file could not be executed.')) as any;
        }
    }

    let meme = mime.lookup(fileExt);
    if (meme === 'application/x-httpd-php') meme = 'text/html';
    context.header('Content-Type', meme || 'application/octet-stream');
    return context.body(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as any);
});

server.use((context, next) => {
    const path = context.req.path;
    if (path === '/@/domains') {
        return context.json({ domains: domains }) as any;
    } else if (path === '/@/uptime') {
        return context.json({ uptime: process.uptime() }) as any;
    } else {
        return next();
    }
});

api(server);

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
