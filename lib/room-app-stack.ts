import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as apigw from "@aws-cdk/aws-apigateway";

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
  }
}
