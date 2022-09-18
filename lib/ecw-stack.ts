import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from 'constructs'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path'
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway'
import { DateParams, FromYesterday } from './business/dto/date-params';
import { Period, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { EcwGracefullImporter } from './graceful-importer';



export class EcwStack extends cdk.Stack {

  private storage: cdk.aws_s3.Bucket;
  private modelLambda: NodejsFunction;
  private measurementLambda: NodejsFunction;
  private gracefullImporter: EcwGracefullImporter;
  private api: RestApi;
  private keepFocusApiKey: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    this.keepFocusApiKey = this.secretKeepFocusApiKey()
    this.storage = this.createStorage()
    this.modelLambda = this.createSyncLambda()
    this.measurementLambda = this.createMeasurementLambda()
    this.storage.grantWrite(this.measurementLambda)
    this.storage.grantWrite(this.modelLambda)
    

    // example curl
    // curl -X POST -v --header "x-api-key: <apikey>" --data '{"to":"2022-09-14", "from":"2022-09-13"}' https://18j436cpdd.execute-api.eu-west-1.amazonaws.com/prod
    this.api = this.createAPI()

    // Create rules for scheduling
    this.createScheduledRules()

    // Gracefull importer
    // For imports reenable unathorized graceful imports, the following two commands.
    // this.gracefullImporter = new EcwGracefullImporter(this, 'ecw-gracefullImporter', {measurementLambdaName: this.measurementLambda.functionName})
    // this.measurementLambda.grantInvoke(this.gracefullImporter.GracefullLambda)

  }

  secretKeepFocusApiKey() {
    // To set secret in aws: Uncomment the following and execute in cli.
    // aws secretsmanager create-secret --name ecw_keepfocus_api_key \
    // --description "The api key to be used for getting authorized with keep focus api" \
    // --secret-string "a very secret api key"
    const keepFocusApiKey = cdk.aws_secretsmanager.Secret.fromSecretNameV2(this, 
          "ecw_keepfocus_api_key_id", 
          "ecw_keepfocus_api_key"
      ).secretValue.unsafeUnwrap()
      return keepFocusApiKey;
  }


  createStorage() {
    const storage = new s3.Bucket(this, 'ecw-storage', {
      encryption: cdk.aws_s3.BucketEncryption.KMS,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketKeyEnabled: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })
    return storage
  }

  createSyncLambda(){
    const modelLambda = new NodejsFunction(this, "ecw-lambda-model", {
      entry: path.join(__dirname, 'lambda-functions', 'model.ts'),
      runtime: lambda.Runtime.NODEJS_14_X,
      description: "Calls energy consumption api and stores models ie. Installations, etc. in s3",
      timeout: cdk.Duration.minutes(1),
      environment: {
        RESULT_BUCKET: this.storage.bucketName,
        KEEP_FOCUS_API_KEY: this.keepFocusApiKey,
      }
    })
    return modelLambda
  }

  createMeasurementLambda() {
    const measurementLambda = new NodejsFunction(this, "ecw-lambda-measurement", {
      entry: path.join(__dirname, 'lambda-functions', 'measurements.ts'),
      runtime: lambda.Runtime.NODEJS_14_X,
      description: "Calls energy consumption api for meters with measurements and stores it in s3",
      timeout: cdk.Duration.minutes(15),
      environment: {
        RESULT_BUCKET: this.storage.bucketName,
        KEEP_FOCUS_API_KEY: this.keepFocusApiKey,
      }
    })
    return measurementLambda
  }

  createScheduledRules(){
    new cdk.aws_events.Rule(this, "ecw-monthly-modelsync-scheduler", {
      description: "Schedule lambda to update energy consumption models. ie. Installations, etc.",
      schedule: cdk.aws_events.Schedule.rate(cdk.Duration.days(30)),
      targets: [new cdk.aws_events_targets.LambdaFunction(this.modelLambda)]
    })
  
    const measurementRule = new cdk.aws_events.Rule(this, "ecw-daily-measurement-scheduler", {
      description: "Schedule lambda to fetch new energy consumption measurements.",
      schedule: cdk.aws_events.Schedule.rate(cdk.Duration.days(1))
    })
  
    measurementRule.addTarget(
      new cdk.aws_events_targets.ApiGateway(this.api, {
        path: '/',
        method: 'POST',
        stage: 'prod',
        postBody: cdk.aws_events.RuleTargetInput.fromObject(FromYesterday()),
      })
    )
  }

  createAPI() {
    const api = new apigateway.RestApi(this, "measurement-control-api", {
      restApiName: "Ecw Measurement control service",
      description: "This control service allows to command measurements to be taken given from and to dates.",
    });
  
    const postIntegration = new apigateway.LambdaIntegration(this.measurementLambda, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });
  
    const usagePlan = api.addUsagePlan("ecw-manual-measurement-usageplan", {
      name: "ecw-manual-measurement-usageplan-props",
      apiStages: [{ api: api, stage: api.deploymentStage }],
      throttle: { burstLimit: 500, rateLimit: 1000 }, quota: { limit: 10000000, period: Period.WEEK },
      description: "The default usage plan for the apigateway",
    })
    const key = new apigateway.ApiKey(this, 'apikey', {
      apiKeyName: "ecw-apikey",
      description: "Api key used to initiate new measurements manually",
    })
    usagePlan.addApiKey(key)
  
    api.root.addMethod("POST", postIntegration, { apiKeyRequired: true })
  
    return api
  
  }

}
