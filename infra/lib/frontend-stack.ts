/**
 * FrontendStack: Amplify Hosting アプリ。
 *
 * 研修ポイント:
 * - Amplify は GitHub リポジトリと連携してビルド＆配信
 * - 環境変数でバックエンドAPI URLなどを渡す
 * - カスタムドメインやSSRは応用課題
 *
 * 注: このスタックをデプロイする前に、GitHub 連携の OAuth トークンを
 * Secrets Manager に保存する必要があります（docs/DEPLOY.md参照）。
 */
import * as cdk from "aws-cdk-lib";
import * as amplify from "aws-cdk-lib/aws-amplify";
import { Construct } from "constructs";

interface Props extends cdk.StackProps {
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  cognitoDomain: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // GitHub 連携を使う場合のトークン（事前にSecrets Managerに保存）
    // 学習段階では Amplify コンソールから手動作成でも良い
    const githubTokenSecretName = "todo/github/oauth-token";
    const githubRepoUrl =
      process.env.GITHUB_REPO_URL ?? "https://github.com/YOUR_ORG/training-todo-app";

    const amplifyApp = new amplify.CfnApp(this, "AmplifyApp", {
      name: "todo-frontend",
      repository: githubRepoUrl,
      oauthToken: cdk.SecretValue.secretsManager(githubTokenSecretName).unsafeUnwrap(),
      buildSpec: this.buildSpec(),
      environmentVariables: [
        { name: "VITE_API_BASE_URL", value: `http://${props.apiUrl}` },
        { name: "VITE_COGNITO_DOMAIN", value: props.cognitoDomain },
        { name: "VITE_COGNITO_CLIENT_ID", value: props.userPoolClientId },
        { name: "VITE_AUTH_MOCK", value: "false" },
        { name: "_LIVE_UPDATES", value: "[{\"pkg\":\"node\",\"type\":\"nvm\",\"version\":\"20\"}]" },
      ],
      customRules: [
        // SPA のルーティング対応
        {
          source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
    });

    const mainBranch = new amplify.CfnBranch(this, "MainBranch", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      enableAutoBuild: true,
      stage: "PRODUCTION",
    });
    mainBranch.addDependency(amplifyApp);

    new cdk.CfnOutput(this, "AmplifyAppId", { value: amplifyApp.attrAppId });
    new cdk.CfnOutput(this, "AmplifyAppUrl", {
      value: `https://main.${amplifyApp.attrDefaultDomain}`,
    });
  }

  private buildSpec(): string {
    return `version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
`;
  }
}
