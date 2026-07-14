import express, { Application } from 'express';
import { ServerRoutes } from './routes/routes';
import { initLogger, SchemaDirectory } from '@finos/calm-shared';
import { Server } from 'http';

export function startServer(
    port: string,
    host: string,
    schemaDirectory: SchemaDirectory,
    verbose: boolean,
    rateLimitWindowMs: number = 900000, // 15 minutes
    rateLimitMaxRequests: number = 100
): Server {
    const app: Application = express();
    const serverRoutesInstance = new ServerRoutes(
        schemaDirectory,
        verbose,
        rateLimitWindowMs,
        rateLimitMaxRequests
    );
    const allRoutes = serverRoutesInstance.router;

    // The render endpoint accepts whole CALM documents, which routinely exceed
    // express.json's 100kb default. RenderRouter mounts its own higher-limit parser,
    // so the app-level parser must skip that route or it would 413 large bodies first.
    const jsonParser = express.json();
    app.use((req, res, next) => {
        if (req.path.startsWith('/calm/render')) {
            return next();
        }
        return jsonParser(req, res, next);
    });
    app.use('/', allRoutes);

    return app.listen(parseInt(port), host, () => {
        const logger = initLogger(verbose, 'calm-server');
        logger.info(`CALM Server is running on http://${host}:${port}`);
    });
}
