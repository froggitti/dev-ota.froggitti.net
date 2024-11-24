/**
 * Create an error object with status and message.
 * @param status The status code of the error.
 * @param message The message of the error.
 * @returns The error object.
 */
export function createError(status: number, message: string) {
    return {
        status,
        message,
    };
}
