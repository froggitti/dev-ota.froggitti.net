import { Hono } from 'hono';
import { apiHostDomainName } from './config';
import fs from 'node:fs';

export default function (app: Hono) {
    app.get(`/${apiHostDomainName}/gif`, async (context) => {
        const gifs = fs.readdirSync(`client/${apiHostDomainName}/gifs/`);
        const gif = gifs[Math.floor(Math.random() * gifs.length)];

        const url = new URL(context.req.url);

        return context.json({ url: url.origin + `/gifs/${gif}` });
    });
}
