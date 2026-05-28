import * as vscode from 'vscode'
import { NavigationService } from './core/services/navigation-service'
import { LoggingService } from './core/services/logging-service'
import type { Logger } from './core/ports/logger'
import { ConfigService } from './core/services/config-service'
import { Config } from './core/ports/config'
import { RefreshService } from './core/mediators/refresh-service'
import { SelectionService } from './core/mediators/selection-service'
import { StoreReactionMediator } from './core/mediators/store-reaction-mediator'
import { PreviewPanelFactory } from './features/preview/preview-panel-factory'
import { WatchService } from './core/mediators/watch-service'
import { TreeViewFactory } from './features/tree-view/tree-view-factory'
import { EditorFactory } from './features/editor/editor-factory'
import { CommandRegistrar } from './commands/command-registrar'
import { DiagnosticsService } from './core/services/diagnostics-service'
import { createApplicationStore, type ApplicationStoreApi } from './application-store'
import { setWidgetLogger } from '@finos/calm-shared'
import { ValidationService } from './features/validation/validation-service'
import { createTestApi, CalmExtensionTestApi } from './test-api'
import { HubConfigService } from './features/hub/hub-config-service'
import { HubAuthService } from './features/hub/hub-auth-service'
import { HubDataSource } from './features/hub/hub-data-source'
import { HubTreeDataProvider } from './features/hub/hub-tree-data-provider'
import { createOpenFromHubCommand } from './commands/open-from-hub-command'
import { createHubAuthCommands } from './commands/hub-auth-commands'
import { CalmDetailsViewProvider } from './features/details/details-view-provider'

/**
 * Main extension controller that orchestrates all VS Code extension functionality
 */
export class CalmExtensionController {
  private disposables: vscode.Disposable[] = []
  private logging: LoggingService | undefined
  private previewPanelFactory: PreviewPanelFactory | undefined

  getTestApi(): CalmExtensionTestApi | undefined {
    return this.previewPanelFactory ? createTestApi(this.previewPanelFactory) : undefined
  }

  async start(context: vscode.ExtensionContext) {
    this.logging = new LoggingService('vscode-ext')
    const log: Logger = this.logging

    // Configure calm-widgets to log to the CALM output channel
    setWidgetLogger({
      debug: (msg) => log.debug?.(`[widget] ${msg}`),
      info: (msg) => log.info?.(`[widget] ${msg}`),
      warn: (msg) => log.warn?.(`[widget] ${msg}`),
      error: (msg) => log.error?.(`[widget] ${msg}`),
    })

    const diagnostics = new DiagnosticsService(log)
    const store: ApplicationStoreApi = createApplicationStore()
    void diagnostics.logStartup(context)

    const configService: Config = new ConfigService()
    const previewPanelFactory = new PreviewPanelFactory()
    this.previewPanelFactory = previewPanelFactory
    const treeManager = new TreeViewFactory(store)
    const editorFactory = new EditorFactory(store)
    const navigationService = new NavigationService(log, configService)

    // Listen for configuration changes to reset navigation service
    this.disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('calm.urlMapping')) {
        log.info?.('[extension] Configuration changed: calm.urlMapping - resetting navigation service')
        navigationService.reset()
      }
    }))

    let _isCurrentlyInTemplateMode = false
    const setTemplateMode = (enabled: boolean) => {
      _isCurrentlyInTemplateMode = enabled
      store.getState().setTemplateMode(enabled)
    }
    const selectionService = new SelectionService(
      store,
      () => previewPanelFactory.get(),
      treeManager,
      async (doc: vscode.TextDocument, id: string) => await editorFactory.revealById(doc, id),
      navigationService
    )

    treeManager.bindSelectionService(selectionService)
    editorFactory.bindSelectionService(selectionService)

    const refreshService = new RefreshService(log, configService, () => previewPanelFactory.get(), store)
    editorFactory.bindActiveEditorWatcher(previewPanelFactory, refreshService, setTemplateMode, log)
    const watchService = new WatchService(configService, refreshService)
    watchService.registerAll(context)

    new CommandRegistrar(context, store, navigationService, log).registerAll()

    // Initialize validation service (await to ensure schemas are loaded before validating documents)
    const validationService = new ValidationService(log, configService)
    await validationService.register(context)

    const storeReactionMediator = new StoreReactionMediator(
      store,
      previewPanelFactory,
      refreshService,
      selectionService,
      log,
      context,
    )

    storeReactionMediator.setupReactions()

    // Details sidebar view — mounts the shared Sidebar component in a native
    // VSCode WebviewView so the preview diagram can fill its panel while the
    // selection details still live in the activity-bar sidebar.
    const detailsProvider = new CalmDetailsViewProvider(context, store, log)
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        CalmDetailsViewProvider.viewType,
        detailsProvider,
        { webviewOptions: { retainContextWhenHidden: true } },
      ),
      detailsProvider,
    )

    // Hub feature wiring — tree view, data source, auth, and commands.
    const hubConfig = new HubConfigService(context)
    const hubAuth = new HubAuthService(hubConfig)
    const hubDataSource = new HubDataSource(hubConfig, hubAuth)
    const hubTreeProvider = new HubTreeDataProvider(hubConfig, hubDataSource)
    const hubTreeView = vscode.window.createTreeView('calmHubSidebar', {
      treeDataProvider: hubTreeProvider,
      showCollapseAll: true,
    })
    // Initialise the signed-in context key based on whether a token is stored.
    void hubConfig.readToken().then((t) => hubConfig.setSignedInContext(!!t))
    context.subscriptions.push(
      hubTreeView,
      hubTreeProvider,
      createOpenFromHubCommand(context, hubDataSource, log),
      ...createHubAuthCommands(hubConfig, hubTreeProvider, log),
    )

    this.disposables.push(
      previewPanelFactory,
      treeManager,
      editorFactory,
      storeReactionMediator,
      validationService
    )
  }

  dispose() {
    this.logging?.dispose()
    this.disposables.forEach(d => { try { d.dispose() } catch { } })
  }
}
