// continueSync.ts
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ApiDefinition } from './sync';

export async function syncToContinueConfig(yapiData:any) {
  const continueConfigPath = getContinueConfigPath();
  const currentConfig = readContinueConfig(continueConfigPath);
  // 更新或添加customCommands中的目标配置
  const updatedConfig = updateCustomCommands(currentConfig, yapiData);
  // 写入更新后的配置
  writeContinueConfig(continueConfigPath, updatedConfig);
  return updatedConfig.newPrompt
}

function getContinueConfigPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.continue', 'config.json');
}

function readContinueConfig(filePath: string): any {
  if (!fs.existsSync(filePath)) {
    return {
      customCommands: []
    };
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data)
  } catch (error) {
    throw new Error(`读取Continue配置文件失败: ${error.message}`);
  }
}
function updateCustomCommands(config: any, yapiData: ApiDefinition[]): any {
  const targetCommandName = '生成YAPI接口类型';
  const updatedCommands = [...(config.customCommands || [])];
  // 查找目标命令
  const targetIndex = updatedCommands.findIndex(
    cmd => cmd.name === targetCommandName
  );
  let newPrompt = ``
  if (targetIndex === -1) {
    // 如果没有找到，添加新的命令
    return console.log('未找到命令：生成YAPI接口类型')
  } else {
    // prompt是一个专一的json字符串
    const prompt = JSON.parse(updatedCommands[targetIndex].prompt)
    Object.assign(prompt,{YAPI_Info:yapiData})
    newPrompt = prompt
    updatedCommands[targetIndex].prompt = JSON.stringify(prompt)
  }
  return {
    ...config,
    customCommands: updatedCommands,
    newPrompt
  };
}

function writeContinueConfig(filePath: string, config: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}
