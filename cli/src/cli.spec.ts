import { CALM_META_SCHEMA_DIRECTORY } from '@finos/calm-shared';
import { Command } from 'commander';

let calmShared: typeof import('@finos/calm-shared');
let validateModule: typeof import('./command-helpers/validate');
let serverModule: typeof import('./server/cli-server');
let templateModule: typeof import('./command-helpers/template');
let optionsModule: typeof import('./command-helpers/generate-options');
let fileSystemDocLoaderModule: typeof import('@finos/calm-shared/dist/document-loader/file-system-document-loader');
let setupCLI: typeof import('./cli').setupCLI;

describe('CLI Commands', () => {
    let program: Command;

    beforeEach(async () => {
        vi.resetModules();
        vi.clearAllMocks();

        calmShared = await import('@finos/calm-shared');
        validateModule = await import('./command-helpers/validate');
        serverModule = await import('./server/cli-server');
        templateModule = await import('./command-helpers/template');
        optionsModule = await import('./command-helpers/generate-options');
        fileSystemDocLoaderModule = await import('@finos/calm-shared/dist/document-loader/file-system-document-loader');

        vi.spyOn(calmShared, 'runGenerate').mockResolvedValue(undefined);
        vi.spyOn(calmShared.TemplateProcessor.prototype, 'processTemplate').mockResolvedValue(undefined);
        vi.spyOn(calmShared.Docifier.prototype, 'docify').mockResolvedValue(undefined);

        vi.spyOn(validateModule, 'runValidate').mockResolvedValue(undefined);
        vi.spyOn(validateModule, 'checkValidateOptions').mockResolvedValue(undefined);

        vi.spyOn(serverModule, 'startServer').mockImplementation(vi.fn());
        vi.spyOn(templateModule, 'getUrlToLocalFileMap').mockReturnValue(new Map());

        vi.spyOn(optionsModule, 'promptUserForOptions').mockResolvedValue([]);

        vi.spyOn(fileSystemDocLoaderModule, 'FileSystemDocumentLoader').mockImplementation(vi.fn());
        vi.spyOn(fileSystemDocLoaderModule.FileSystemDocumentLoader.prototype, 'loadMissingDocument').mockResolvedValue({});

        const cliModule = await import('./cli');
        setupCLI = cliModule.setupCLI;

        program = new Command();
        setupCLI(program);
    });

    describe('Generate Command', () => {
        it('should call runGenerate with correct arguments', async () => {
            await program.parseAsync([
                'node', 'cli.js', 'generate',
                '-p', 'pattern.json',
                '-o', 'output.json',
                '--verbose',
                '--schemaDirectory', 'schemas',
            ]);

            expect(fileSystemDocLoaderModule.FileSystemDocumentLoader.prototype.loadMissingDocument).toHaveBeenCalledWith('pattern.json', 'pattern');
            expect(optionsModule.promptUserForOptions).toHaveBeenCalled();

            expect(fileSystemDocLoaderModule.FileSystemDocumentLoader).toHaveBeenCalledWith([CALM_META_SCHEMA_DIRECTORY, 'schemas'], true);

            expect(calmShared.runGenerate).toHaveBeenCalledWith(
                {}, 'output.json', true, expect.any(calmShared.SchemaDirectory), []
            );
        });
    });

    describe('Validate Command', () => {
        it('should call runValidate with correct options', async () => {
            await program.parseAsync([
                'node', 'cli.js', 'validate',
                '-p', 'pattern.json',
                '-a', 'arch.json',
            ]);

            expect(validateModule.checkValidateOptions).toHaveBeenCalled();
            expect(validateModule.runValidate).toHaveBeenCalledWith(expect.objectContaining({
                patternPath: 'pattern.json',
                architecturePath: 'arch.json',
            }));
        });
    });

    describe('Server Command', () => {
        it('should call startServer with correct options', async () => {
            await program.parseAsync([
                'node', 'cli.js', 'server',
                '--port', '4000',
                '--schemaDirectory', 'mySchemas',
                '--verbose',
            ]);

            expect(serverModule.startServer).toHaveBeenCalledWith(
                '4000',
                expect.any(calmShared.SchemaDirectory),
                true,
            );
        });
    });

    describe('Template Command', () => {
        it('should instantiate TemplateProcessor and call processTemplate', async () => {
            await program.parseAsync([
                'node', 'cli.js', 'template',
                '--input', 'model.json',
                '--bundle', 'templateDir',
                '--output', 'outDir',
                '--verbose',
            ]);

            expect(calmShared.TemplateProcessor.prototype.processTemplate).toHaveBeenCalled();
        });
    });

    describe('Docify Command', () => {
        it('should instantiate Docifier and call docify', async () => {
            await program.parseAsync([
                'node', 'cli.js', 'docify',
                '--input', 'model.json',
                '--output', 'outDir',
                '--url-to-local-file-mapping', 'url-to-file-directory.json',
                '--verbose',
            ]);

            expect(calmShared.Docifier.prototype.docify).toHaveBeenCalled();
        });
    });
});
