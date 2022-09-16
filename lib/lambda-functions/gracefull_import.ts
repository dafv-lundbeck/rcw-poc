import * as aws from 'aws-sdk'
import { Context } from 'aws-lambda'
import { prepareOutput } from '../business/auxiliary'

const { QUEUE_URL: queueUrl, LAMBDA_NAME: lambdaName } = process.env
const sqs = new aws.SQS()
const measurementLambda = new aws.Lambda()

const handleError = (err: Error) => {
    if (err != undefined) {
        console.error(err.message)
        throw err
    }
}

export const handler = async (event: any, _ctx: Context) => {
    console.log("Peeking gracefull queue for imports")
    await sqs.receiveMessage(
        {
            QueueUrl: queueUrl!,
            VisibilityTimeout: 20,
            WaitTimeSeconds: 0,
            MessageAttributeNames: ["All"],
            MaxNumberOfMessages: 1
        },
        async (err, data) => {
            handleError(err)
            if (data.Messages && data.Messages.length > 0) {
                console.log(`Message received with body: ${data.Messages[0].Body}`)
                const params = data.Messages[0].Body
                await sqs.deleteMessage({ QueueUrl: queueUrl!, ReceiptHandle: data.Messages[0].ReceiptHandle! }, (err, _) => handleError(err)).promise();
                await measurementLambda.invoke({
                    FunctionName: lambdaName!,
                    Payload: Buffer.from(prepareOutput(params), 'utf-8').toString(),
                    InvocationType: "RequestResponse"
                }, (err, _) => handleError(err)).promise()
                console.log("Finished invoking measurement lambda")
            } else{
                console.log("Found no messages")
            }
        }).promise()
}
