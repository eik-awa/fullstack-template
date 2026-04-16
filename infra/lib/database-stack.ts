/**
 * DatabaseStack: RDS MySQL。
 *
 * 研修ポイント:
 * - 無料枠: db.t3.micro + 20GB ストレージ
 * - 認証情報は Secrets Manager で管理 → 環境変数直書きしない
 * - プライベートサブネットのみ配置
 */
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

interface Props extends cdk.StackProps {
  vpc: ec2.Vpc;
  backendSecurityGroup: ec2.SecurityGroup;
}

export class DatabaseStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.ISecret;
  public readonly dbEndpoint: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    // DB用 SG: backend SG からのみ 3306
    const dbSg = new ec2.SecurityGroup(this, "DbSg", {
      vpc: props.vpc,
      description: "RDS MySQL SG",
      allowAllOutbound: false,
    });
    dbSg.addIngressRule(
      props.backendSecurityGroup,
      ec2.Port.tcp(3306),
      "From backend tasks",
    );

    // Secrets Manager でDB認証情報を自動生成
    const dbCredentials = rds.Credentials.fromGeneratedSecret("admin", {
      secretName: "todo/db/credentials",
    });

    const dbInstance = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO, // 無料枠
      ),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      credentials: dbCredentials,
      databaseName: "todos",
      allocatedStorage: 20, // 無料枠
      storageType: rds.StorageType.GP2,
      backupRetention: cdk.Duration.days(1),
      deletionProtection: false, // 研修用
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      multiAz: false, // 無料枠
      publiclyAccessible: false,
    });

    this.dbSecret = dbInstance.secret!;
    this.dbEndpoint = dbInstance.instanceEndpoint.hostname;

    new cdk.CfnOutput(this, "DbEndpoint", { value: this.dbEndpoint });
    new cdk.CfnOutput(this, "DbSecretArn", { value: this.dbSecret.secretArn });
  }
}
