#!/usr/bin/env node
/**
 * CDK アプリのエントリポイント。
 *
 * スタック分割の指針:
 * - ライフサイクルの違うものは別スタック（DBはめったに作り直さない、ECSは頻繁に更新）
 * - 削除順を考慮して依存関係を張る
 */
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NetworkStack } from "../lib/network-stack";
import { AuthStack } from "../lib/auth-stack";
import { DatabaseStack } from "../lib/database-stack";
import { BackendStack } from "../lib/backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1",
};

const envName = app.node.tryGetContext("app:envName") ?? "dev";
const prefix = `Todo${envName.charAt(0).toUpperCase()}${envName.slice(1)}`;

const network = new NetworkStack(app, `${prefix}NetworkStack`, { env });

const auth = new AuthStack(app, `${prefix}AuthStack`, { env });

const database = new DatabaseStack(app, `${prefix}DatabaseStack`, {
  env,
  vpc: network.vpc,
  backendSecurityGroup: network.backendSecurityGroup,
});

const backend = new BackendStack(app, `${prefix}BackendStack`, {
  env,
  vpc: network.vpc,
  backendSecurityGroup: network.backendSecurityGroup,
  albSecurityGroup: network.albSecurityGroup,
  dbSecret: database.dbSecret,
  dbEndpoint: database.dbEndpoint,
  userPoolId: auth.userPool.userPoolId,
  userPoolClientId: auth.userPoolClient.userPoolClientId,
});
backend.addDependency(database);

new FrontendStack(app, `${prefix}FrontendStack`, {
  env,
  apiUrl: backend.albDnsName,
  userPoolId: auth.userPool.userPoolId,
  userPoolClientId: auth.userPoolClient.userPoolClientId,
  cognitoDomain: auth.cognitoDomain,
});

cdk.Tags.of(app).add("Project", "training-todo-app");
cdk.Tags.of(app).add("Env", envName);
