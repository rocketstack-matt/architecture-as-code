import evaluation from '../../../calm-hub/src/main/resources/META-INF/calm-extensions/builtin/control-evaluation/extension.json';
import deployment from '../../../calm-hub/src/main/resources/META-INF/calm-extensions/builtin/deployment/extension.json';
import type { DecoratorView } from '../visualizer/contracts/contracts.js';

export const BUILTIN_DECORATOR_VIEWS = [
    ...evaluation.contributes['decorator-views'],
    ...deployment.contributes['decorator-views'],
] as DecoratorView[];
