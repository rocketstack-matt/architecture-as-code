import express, { Application } from 'express';
import { CLIServerRoutes } from './routes/routes.js';
import { initLogger } from '@finos/calm-shared/logger.js';

export function startServer(options: { port: string, schemaDirectory: string, verbose: boolean }) {
    const app: Application = express();
    const cliServerRoutesInstance = new CLIServerRoutes(options.schemaDirectory, options.verbose);
    const allRoutes = cliServerRoutesInstance.router;

    app.use(express.json());
    app.use('/', allRoutes);

    const port = options.port;

    app.listen(port, () => {
        const logger = initLogger(options.verbose);
        logger.info(`CALM Server is running on http://localhost:${port}`);
    });
}
