import { Construct } from "constructs";
import * as sqs from 'aws-cdk-lib/aws-sqs'
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as path from 'path'

export interface EcwGracefullImporterProps{
    measurementLambdaName: string
}

const GracefullRate = cdk.Duration.minutes(4)

export class EcwGracefullImporter extends Construct{
    private props: EcwGracefullImporterProps;
    private queue: sqs.Queue;
    public GracefullLambda: NodejsFunction;

    constructor(scope: Construct, id: string, props: EcwGracefullImporterProps){
        super(scope, id)
        this.props = props;
        this.queue = this.createQueue()
        this.GracefullLambda = this.createImportLambda()
        this.queue.grantConsumeMessages(this.GracefullLambda)
        this.createGracefullSchedule()
    }

    createQueue(){
        const queue = new Queue(this, 'ecw-gracefulimport-queue');

        return queue
    }

    createImportLambda(){
        const importLambda = new NodejsFunction(this, "ecw-graceful-import-lambda", {
            entry: path.join(__dirname, 'lambda-functions', 'gracefull_import.ts'),
            runtime: lambda.Runtime.NODEJS_14_X,
            description: "Fetches a single entry from a queue and invokes measurement lambda",
            timeout: cdk.Duration.minutes(15),
            environment: {
                QUEUE_URL: this.queue.queueUrl,
                LAMBDA_NAME: this.props.measurementLambdaName
            }
          })
          return importLambda
    }

    createGracefullSchedule(){
        new cdk.aws_events.Rule(this, "ecw-gracefull-importer-scheduler", {
            description: "Schedule lambda to update energy consumption models. ie. Installations, etc.",
            schedule: cdk.aws_events.Schedule.rate(GracefullRate),
            targets: [new cdk.aws_events_targets.LambdaFunction(this.GracefullLambda)]
          })
    }


}