import {CALM_META_SCHEMA_DIRECTORY, runGenerate} from '@finos/calm-shared';
import { Option, Command } from 'commander';
import inquirer from 'inquirer';
import { version } from '../package.json';
import logger from 'winston';
import { loadFile } from './fileInput';
import { CalmChoice, CalmOption, optionsFor } from '@finos/calm-shared/commands/generate/components/options';

const FORMAT_OPTION = '-f, --format <format>';
const ARCHITECTURE_OPTION = '-a, --architecture <file>';
const GENERATE_ALL_OPTION = '-g, --generateAll';
const OUTPUT_OPTION = '-o, --output <file>';
const PATTERN_OPTION = '-p, --pattern <file>';
const SCHEMAS_OPTION = '-s, --schemaDirectory <path>';
const STRICT_OPTION = '--strict';
const VERBOSE_OPTION = '-v, --verbose';

logger.configure({
    transports: [
        new logger.transports.Console({
            //This seems odd, but we want to allow users to parse JSON output from the STDOUT. We can't do that if it's polluted.
            stderrLevels: ['error', 'warn', 'info'],
        })
    ],
    level: 'debug',
    format: logger.format.combine(
        logger.format.label({ label: 'calm' }),
        logger.format.cli(),
        logger.format.splat(),
        logger.format.errors({ stack: true }),
        logger.format.printf(({ level, message, stack, label }) => {
            if (stack) {
                return `${level} [${label}]: ${message} - ${stack}`;
            }
            return `${level} [${label}]: ${message}`;
        }, ),
    ),
    
});

export function setupCLI(program: Command) {
    program
        .name('calm')
        .version(version)
        .description('A set of tools for interacting with the Common Architecture Language Model (CALM)');

    program
        .command('generate')
        .description('Generate an architecture from a CALM pattern file.')
        .requiredOption(PATTERN_OPTION, 'Path to the pattern file to use. May be a file path or a URL.')
        .requiredOption(OUTPUT_OPTION, 'Path location at which to output the generated file.', 'architecture.json')
        .option(SCHEMAS_OPTION, 'Path to the directory containing the meta schemas to use.', CALM_META_SCHEMA_DIRECTORY)
        .option(VERBOSE_OPTION, 'Enable verbose logging.', false)
        .option(GENERATE_ALL_OPTION, 'Generate all properties, ignoring the "required" field.', false)
        .action(async (options) => {
            const pattern: object = loadFile(options.pattern);
            const patternOptions: CalmOption[] = optionsFor(pattern);
            logger.debug('Pattern options found: [%O]', patternOptions);
            
            const questions = [];
    
            for(const option of patternOptions) {
                const choiceDescriptions = option.choices.map(choice => choice.description);
                questions.push(
                    {
                        type: option.optionType === 'oneOf' ? 'list' : 'checkbox',
                        name: `${patternOptions.indexOf(option)}`,
                        message: option.prompt,
                        choices: choiceDescriptions
                    }
                );
            }
            const answers: string[] = await inquirer.prompt(questions)
                .then(answers => Object.values(answers).flatMap(val => val));
            logger.debug('User choice these options: [%O]', answers);
    
            const chosenChoices: CalmChoice[] = patternOptions.flatMap(option =>
                option.choices.filter(choice => answers.find(answer => answer === choice.description))
            );
    
            await runGenerate(pattern, options.output, !!options.verbose, options.generateAll, chosenChoices, options.schemaDirectory);
        });

    program
        .command('validate')
        .description('Validate that an architecture conforms to a given CALM pattern.')
        .option(PATTERN_OPTION, 'Path to the pattern file to use. May be a file path or a URL.')
        .option(ARCHITECTURE_OPTION, 'Path to the architecture file to use. May be a file path or a URL.')
        .option(SCHEMAS_OPTION, 'Path to the directory containing the meta schemas to use.', CALM_META_SCHEMA_DIRECTORY)
        .option(STRICT_OPTION, 'When run in strict mode, the CLI will fail if any warnings are reported.', false)
        .addOption(
            new Option(FORMAT_OPTION, 'The format of the output')
                .choices(['json', 'junit', 'pretty'])
                .default('json')
        )
        .option(OUTPUT_OPTION, 'Path location at which to output the generated file.')
        .option(VERBOSE_OPTION, 'Enable verbose logging.', false)
        .action(async (options) => {
            const { checkValidateOptions, runValidate } = await import('./command-helpers/validate');
            checkValidateOptions(program, options, PATTERN_OPTION, ARCHITECTURE_OPTION);
            await runValidate(options);
        });

    program
        .command('server')
        .description('Start a HTTP server to proxy CLI commands. (experimental)')
        .option('-p, --port <port>', 'Port to run the server on', '3000')
        .requiredOption(SCHEMAS_OPTION, 'Path to the directory containing the meta schemas to use.')
        .option(VERBOSE_OPTION, 'Enable verbose logging.', false)
        .action(async (options) => {
            const { startServer } = await import('./server/cli-server');
            startServer(options);
        });

    program
        .command('template')
        .description('Generate files from a CALM model using a Handlebars template bundle')
        .requiredOption('--input <path>', 'Path to the CALM model JSON file')
        .requiredOption('--bundle <path>', 'Path to the template bundle directory')
        .requiredOption('--output <path>', 'Path to output directory')
        .option('--url-to-local-file-mapping <path>', 'Path to mapping file which maps URLs to local paths')
        .option(VERBOSE_OPTION, 'Enable verbose logging.', false)
        .action(async (options) => {
            const { getUrlToLocalFileMap } = await import('./command-helpers/template');
            const { TemplateProcessor } = await import('@finos/calm-shared');
            if (options.verbose) {
                process.env.DEBUG = 'true';
            }
            const localDirectory = getUrlToLocalFileMap(options.urlToLocalFileMapping);
            const processor = new TemplateProcessor(options.input, options.bundle, options.output, localDirectory);
            await processor.processTemplate();
        });

    program
        .command('docify')
        .description('Generate a documentation website off your CALM model')
        .requiredOption('--input <path>', 'Path to the CALM model JSON file')
        .requiredOption('--output <path>', 'Path to output directory')
        .option('--url-to-local-file-mapping <path>', 'Path to mapping file which maps URLs to local paths')
        .option(VERBOSE_OPTION, 'Enable verbose logging.', false)
        .action(async (options) => {
            const { getUrlToLocalFileMap } = await import('./command-helpers/template');
            const { Docifier } = await import('@finos/calm-shared');
            if (options.verbose) {
                process.env.DEBUG = 'true';
            }
            const localDirectory = getUrlToLocalFileMap(options.urlToLocalFileMapping);
            const docifier = new Docifier('WEBSITE', options.input, options.output, localDirectory);
            await docifier.docify();
        });
}
