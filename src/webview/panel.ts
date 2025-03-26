import * as vscode from 'vscode';
import * as path from 'path';
import { syncYapiData } from '../sync';

export class YapiPanel {
  public static currentPanel: YapiPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(context: vscode.ExtensionContext) {
    if (YapiPanel.currentPanel) {
      YapiPanel.currentPanel._panel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'yapiConfig',
      'YAPI 配置中心',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, 'src/webview'))
        ]
      }
    );

    YapiPanel.currentPanel = new YapiPanel(panel, context);
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlForWebview(context);

    // 处理来自Webview的消息
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'saveConfig':
            await this._saveConfig(message);
            break;
          case 'triggerSync':
            await this._handleSync();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async _saveConfig(config: any) {
    const workspaceConfig = vscode.workspace.getConfiguration('yapiSync');
    await workspaceConfig.update('apiUrl', config.apiUrl, true);
    await workspaceConfig.update('token', config.token, true);
    await workspaceConfig.update('projectId', config.projectId, true);
    await workspaceConfig.update('outputPath', config.outputPath, true);
    vscode.window.showInformationMessage('配置已保存');
  }

  private async _handleSync() {
    try {
      await syncYapiData();
      this._panel.webview.postMessage({
        command: 'syncResult',
        success: true,
        message: '同步成功'
      });
    } catch (error: any) {
      this._panel.webview.postMessage({
        command: 'syncResult',
        success: false,
        message: error.message
      });
    }
  }

  private _getHtmlForWebview(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('yapiSync');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>YAPI配置中心</title>
        <style>
          .config-container { padding: 20px; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input { width: 100%; padding: 8px; margin-bottom: 10px; }
          .button-group { margin-top: 20px; }
          button {
            padding: 10px 20px;
            margin-right: 10px;
            background: #007acc;
            color: white;
            border: none;
            cursor: pointer;
          }
          button:hover { background: #0062a3; }
          #status { margin-top: 15px; color: #666; }
        </style>
      </head>
      <body>
        <div class="config-container">
          <div class="form-group">
            <label>YAPI地址：</label>
            <input type="text" id="apiUrl" value="${config.get('apiUrl')}">
          </div>
          <div class="form-group">
            <label>访问令牌(token)：</label>
            <input type="password" id="token" value="${config.get('token')}">
          </div>
          <div class="form-group">
            <label>项目ID：</label>
            <input type="number" id="projectId" value="${config.get('projectId')}">
          </div>
          <div class="form-group">
            <label>输出路径：</label>
            <input type="text" id="outputPath" value="${config.get('outputPath')}">
          </div>
          <div class="button-group">
            <button onclick="saveConfig()">保存配置</button>
            <button onclick="startSync()" style="background: #28a745;">立即同步</button>
          </div>
          <div id="status"></div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function saveConfig() {
            const config = {
              apiUrl: document.getElementById('apiUrl').value,
              token: document.getElementById('token').value,
              projectId: parseInt(document.getElementById('projectId').value),
              outputPath: document.getElementById('outputPath').value
            };
            vscode.postMessage({
              command: 'saveConfig',
              ...config
            });
          }

          function startSync() {
            document.getElementById('status').innerHTML = '同步中...';
            vscode.postMessage({
              command: 'triggerSync'
            });
          }

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'syncResult') {
              const statusEl = document.getElementById('status');
              statusEl.innerHTML = message.message;
              statusEl.style.color = message.success ? '#28a745' : '#dc3545';
            }
          });
        </script>
      </body>
      </html>
    `;
  }
}
