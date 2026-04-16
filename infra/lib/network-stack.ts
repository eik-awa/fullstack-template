/**
 * NetworkStack: VPC と Security Group。
 *
 * 研修ポイント:
 * - 2AZ 必須（ALB 要件、RDS マルチAZ化も見据える）
 * - NAT Gateway は高額なので学習用途では使わない
 *   → Public Subnet に ECS を配置し、SG で厳密に制御
 * - SG は「誰から受ける」「誰に出す」を明示的に
 */
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly backendSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // VPC: パブリックとプライベート各2AZ
    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0, // コスト削減: NAT を使わない
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Isolated",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // ALB用 SG: インターネットから 443/80 受付
    this.albSecurityGroup = new ec2.SecurityGroup(this, "AlbSg", {
      vpc: this.vpc,
      description: "ALB security group",
      allowAllOutbound: true,
    });
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "Allow HTTP",
    );
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS",
    );

    // Backend (ECS Task) 用 SG: ALB からのみ 8000 を受付
    this.backendSecurityGroup = new ec2.SecurityGroup(this, "BackendSg", {
      vpc: this.vpc,
      description: "Backend ECS tasks security group",
      allowAllOutbound: true,
    });
    this.backendSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(8000),
      "From ALB",
    );

    new cdk.CfnOutput(this, "VpcId", { value: this.vpc.vpcId });
  }
}
