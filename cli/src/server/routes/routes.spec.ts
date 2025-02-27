import { Router } from 'express';
import { CLIServerRoutes } from './routes.js';
import { ValidationRouter } from './validation-route.js';
import { HealthRouter } from './health-route.js';

const mockUse = jest.fn();
const mockRouter = {
    use: mockUse
};

jest.mock('express', () => ({
    Router: jest.fn(() => mockRouter)
}));

jest.mock('./validation-route.js', () => {
    return {
        ValidationRouter: jest.fn()
    };
});

jest.mock('./health-route.js', () => {
    return {
        HealthRouter: jest.fn()
    };
});

describe('CLIServerRoutes', () => {
    let schemaDirectoryPath: string;
    let cliServerRoutes: CLIServerRoutes;
    let mockRouter: Router;

    beforeEach(() => {
        schemaDirectoryPath = '/path/to/schema';
        cliServerRoutes = new CLIServerRoutes(schemaDirectoryPath);
        mockRouter = cliServerRoutes.router;
    });

    it('should initialize router', () => {
        expect(Router).toHaveBeenCalled();
    });

    it('should set up validate route', () => {
        expect(mockRouter.use).toHaveBeenCalledWith('/calm/validate', mockRouter);
        expect(ValidationRouter).toHaveBeenCalled();
    });

    it('should set up health route', () => {
        expect(mockRouter.use).toHaveBeenCalledWith('/health', mockRouter);
        expect(HealthRouter).toHaveBeenCalled();
    });
});
