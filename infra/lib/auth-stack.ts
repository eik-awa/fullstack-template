/**
 * AuthStack: Cognito User Pool とクライアント。
 *
 * 研修ポイント:
 * - User Pool = 認証（ユーザー管理）
 * - User Pool Client = アプリからの接続設定
 * - Hosted UI を使うと自前でログイン画面を作らなくて済む
 */
import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly cognitoDomain: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "todo-user-pool",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 研修用
    });

    // 一意なドメインプレフィックスを生成
    const domainPrefix = `todo-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`;
    const domain = this.userPool.addDomain("UserPoolDomain", {
      cognitoDomain: { domainPrefix },
    });
    this.cognitoDomain = `${domainPrefix}.auth.${cdk.Stack.of(this).region}.amazoncognito.com`;

    this.userPoolClient = this.userPool.addClient("AppClient", {
      userPoolClientName: "todo-app-client",
      generateSecret: false,
      authFlows: {
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          "http://localhost:5173/auth/callback",
          "https://example.com/auth/callback", // デプロイ後に更新
        ],
        logoutUrls: [
          "http://localhost:5173/",
          "https://example.com/",
        ],
      },
    });

    new cdk.CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "CognitoDomain", { value: this.cognitoDomain });

    // 依存関係を明示（デプロイ順序制御）
    domain.node.addDependency(this.userPool);
  }
}
