import * as vscode from 'vscode';
import { YapiPanel } from './webview/panel';
import { syncYapiData } from './sync';

// 插件激活入口
export function activate(context: vscode.ExtensionContext) {
  console.log('YAPI Sync Pro 已激活');

  // 注册打开配置面板命令
  context.subscriptions.push(
    vscode.commands.registerCommand('yapi-sync.openPanel', () => {
      YapiPanel.createOrShow(context);
    })
  );

  // 注册手动同步命令
  context.subscriptions.push(
    vscode.commands.registerCommand('yapi-sync.manualSync', async () => {
      try {
        await syncYapiData();
        vscode.window.showInformationMessage('同步成功');
      } catch (error: any) {
        vscode.window.showErrorMessage(`同步失败: ${error.message}`);
      }
    })
  );
}

export function deactivate() {}
