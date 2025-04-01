import * as vscode from 'vscode';
import axios from 'axios';
import { omit } from 'lodash';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { syncToContinueConfig } from './continueSync';

type YapiResponseSchema = {
  type: string;
  title: string;
  properties: Record<string, {
    type: string;
    description?: string;
    items?: YapiResponseSchema;
    properties?: Record<string, any>;
    required?: string[];
  }>;
  required?: string[];
};

type QueryParam = {
  required: string;
  _id: string;
  name: string;
  example?: string;
  desc: string;
};

export type ApiDefinition = {
  method: string;
  catid: number;
  title: string;
  path: string;
  req_params: any[];
  res_body_type: "json";
  req_query: QueryParam[];
  req_headers: any[];
  req_body_form: any[];
  res_body: string | YapiResponseSchema; // 实际使用时建议 JSON.parse 转换
};

const NOKEEP_FIELDS = [
  "query_path",
  "edit_uid",
  "status",
  "type",
  "req_body_is_json_schema",
  "res_body_is_json_schema",
  "api_opened",
  "index",
  "tag",
  "_id",
  "project_id",
  "uid",
  "add_time",
  "up_time",
  "__v",
  "markdown",
  "desc",
  "username",
  "catid"
];

export async function syncYapiData() {
  const workspace = vscode.workspace.workspaceFolders;
  if (!workspace) {
    throw new Error('请先打开项目目录');
  }

  const config = vscode.workspace.getConfiguration('yapiSync');
  const requiredFields = ['apiUrl', 'token', 'projectId', 'outputPath'];
  const missing = requiredFields.filter(field => !config.get(field));

  if (missing.length > 0) {
    throw new Error(`缺少必要配置项：${missing.join(', ')}`);
  }

  const apiUrl = config.get('apiUrl') as string;
  const token = config.get('token') as string;
  const projectId = config.get('projectId') as number;
  const outputPath = join(workspace[0].uri.fsPath, config.get('outputPath') as string);

  try {
    // 创建输出目录
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // 调用YAPI接口
    const listResponse = await axios.get(`${apiUrl}/api/interface/list`, {
      params: {
        token,
        project_id: projectId,
        page: 1,
        limit: 2000
      },
      timeout: 10000
    });
    const details: ApiDefinition[] = [];
    for (const item of listResponse.data.data.list) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 控制请求频率
      const detailResponse = await axios.get(`${apiUrl}/api/interface/get`, {
        params: { id: item._id, token }
      });

      if (detailResponse.data.errcode === 0) {
        const detail = omit(detailResponse.data.data,NOKEEP_FIELDS) as ApiDefinition
        details.push(detail);
      }
    }
    const promptAndData = await syncToContinueConfig(details)
    // 写入文件
    writeFileSync(outputPath, JSON.stringify(promptAndData, null, 2));
    return true;
  } catch (error: any) {
    throw new Error(`接口请求失败: ${error.message}`);
  }
}
