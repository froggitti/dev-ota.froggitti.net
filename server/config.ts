/**
 * Port for the server to run on.
 */
export const port: number = 80;

/**
 * Path for the website to be redirected on a 404.
 */
export const notFoundRedirect: string = '/404';

/**
 * Should the server redirect to a 404 on an invalid domain name?
 * If false, the server will return a message error.
 */
export const invalidDomainRedirect: false | string = 'http://localhost/404';
