import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2";
import * as apigwv2i from "@aws-cdk/aws-apigatewayv2-integrations";
import * as s3 from "@aws-cdk/aws-s3";
import * as cloudfront from "@aws-cdk/aws-cloudfront";
import * as route53 from "@aws-cdk/aws-route53";
import * as acm from "@aws-cdk/aws-certificatemanager";
import * as origins from "@aws-cdk/aws-cloudfront-origins";

export interface RoomAppProps extends cdk.StackProps {
  fromAddress?: string;
  domainName?: string;
  zoneId?: string;
  facebookAppId?: string;
  facebookAppSecret?: string;
  amazonClientId?: string;
  amazonClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

export class RoomAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: RoomAppProps = {}) {
    super(scope, id, props);

    const {
      fromAddress,
      domainName,
      zoneId,
      facebookAppId,
      facebookAppSecret,
      amazonClientId,
      amazonClientSecret,
      googleClientId,
      googleClientSecret,
    } = props;

    const fn = new lambda.Function(this, "ConnectionHandler", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("backend/connect"),
      memorySize: 3000,
      environment: {
        NODE_ENV: "production",
      },
      timeout: cdk.Duration.seconds(20),
    });

    const lambdaApi = new apigw.LambdaRestApi(this, "Endpoint", {
      handler: fn,
    });

    const webSocketApi = new apigwv2.WebSocketApi(this, "RoomAppWS", {
      connectRouteOptions: {
        integration: new apigwv2i.LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
      disconnectRouteOptions: {
        integration: new apigwv2i.LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
      defaultRouteOptions: {
        integration: new apigwv2i.LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
    });

    new apigwv2.WebSocketStage(this, "ProdStage", {
      webSocketApi,
      stageName: "prod",
      autoDeploy: true,
    });

    const frontendBucket = new s3.Bucket(this, "FrontendBucket");

    let hostedZone, wwwDomainName, certificate, domainNames;
    if (domainName && zoneId) {
      hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        "HostedZone",
        { hostedZoneId: zoneId, zoneName: domainName + "." }
      );
      wwwDomainName = "www." + domainName;
      certificate = new acm.Certificate(this, "Certificate", {
        domainName,
        subjectAlternativeNames: [wwwDomainName],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
      domainNames = [domainName, wwwDomainName];
    }

    const distroProps: any = {
      logBucket: new s3.Bucket(this, "DistroLoggingBucket"),
      logFilePrefix: "distribution-access-logs/",
      logIncludesCookies: true,
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      defaultRootObject: "index.html",
      domainNames,
      certificate,
    };

    const distro = new cloudfront.Distribution(this, "Distro", distroProps);

    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
    });
    new cdk.CfnOutput(this, "lambdaApiUrl", {
      value: lambdaApi.url,
    });
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: distro.distributionDomainName,
    });
    new cdk.CfnOutput(this, "WSAPIEndpoint", {
      value: webSocketApi.apiEndpoint,
    });
  }
}
