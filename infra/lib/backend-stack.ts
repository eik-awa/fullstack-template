/**
 * BackendStack: ECR, ECS Fargate, ALB。
 *
 * 研修ポイント:
 * - Fargate: サーバレスコンテナ実行
 * - タスク定義 = 「何を動かすか」
 * - サービス = 「何タスク動かすか・ALBとの接続」
 * - タスクロール: コンテナが AWS API を叩くための権限
 * - 実行ロール: ECS自体がログ/イメージ取得する権限
 */
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface Props extends cdk.StackProps {
  vpc: ec2.Vpc;
  backendSecurityGroup: ec2.SecurityGroup;
  albSecurityGroup: ec2.SecurityGroup;
  dbSecret: secretsmanager.ISecret;
  dbEndpoint: string;
  userPoolId: string;
  userPoolClientId: string;
}

export class BackendStack extends cdk.Stack {
  public readonly albDnsName: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // ECR リポジトリ
    const repository = new ecr.Repository(this, "BackendRepo", {
      repositoryName: "todo-backend",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true, // 脆弱性スキャン
    });

    // ECS クラスター
    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: "todo-cluster",
      vpc: props.vpc,
      containerInsights: false, // 無料枠意識
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, "LogGroup", {
      logGroupName: "/aws/ecs/todo-backend",
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // タスク定義
    const taskDefinition = new ecs.FargateTaskDefinition(this, "TaskDef", {
      cpu: 256, // 0.25 vCPU
      memoryLimitMiB: 512,
    });

    // DB Secret を読める権限を付与
    props.dbSecret.grantRead(taskDefinition.taskRole);

    // ECS Exec 用（研修用、本番では検討）
    taskDefinition.taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "AmazonSSMManagedInstanceCore",
      ),
    );

    taskDefinition.addContainer("backend", {
      image: ecs.ContainerImage.fromEcrRepository(repository, "latest"),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "backend",
        logGroup,
      }),
      environment: {
        ENV: "dev",
        LOG_LEVEL: "INFO",
        COGNITO_USER_POOL_ID: props.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClientId,
        COGNITO_REGION: cdk.Stack.of(this).region,
        AUTH_MOCK_ENABLED: "false",
      },
      secrets: {
        // Secrets Manager の値を DATABASE_URL として環境変数に
        DB_HOST: ecs.Secret.fromSecretsManager(props.dbSecret, "host"),
        DB_USER: ecs.Secret.fromSecretsManager(props.dbSecret, "username"),
        DB_PASSWORD: ecs.Secret.fromSecretsManager(props.dbSecret, "password"),
      },
      portMappings: [{ containerPort: 8000, protocol: ecs.Protocol.TCP }],
      healthCheck: {
        command: [
          "CMD-SHELL",
          "python -c \"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\" || exit 1",
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(30),
      },
    });

    // ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.albSecurityGroup,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    });
    this.albDnsName = alb.loadBalancerDnsName;

    // ECS サービス
    const service = new ecs.FargateService(this, "Service", {
      serviceName: "todo-backend-service",
      cluster,
      taskDefinition,
      desiredCount: 1,
      securityGroups: [props.backendSecurityGroup],
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      assignPublicIp: true, // NAT を使わないため
      enableExecuteCommand: true, // ECS Exec でマイグレーション等実行
    });

    // ALB リスナー + ターゲットグループ
    const listener = alb.addListener("Listener", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      // 研修用では HTTP で、本番では ACM + 443 + HTTP→HTTPS リダイレクト
    });

    listener.addTargets("BackendTarget", {
      port: 8000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: "/health",
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: "200",
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    new cdk.CfnOutput(this, "EcrRepoUri", { value: repository.repositoryUri });
    new cdk.CfnOutput(this, "AlbDns", { value: alb.loadBalancerDnsName });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "ServiceName", { value: service.serviceName });
  }
}
