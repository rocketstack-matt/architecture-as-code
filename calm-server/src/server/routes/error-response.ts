/** JSON error envelope shared by the calm-server routes: `{ "error": "<message>" }`. */
export class ErrorResponse {
    error: string;
    constructor(error: string) {
        this.error = error;
    }
}
