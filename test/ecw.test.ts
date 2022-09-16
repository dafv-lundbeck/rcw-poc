// import * as cdk from 'aws-cdk-lib';
// import { Template } from 'aws-cdk-lib/assertions';
// import * as Ecw from '../lib/ecw-stack';
import * as aws from 'aws-sdk'

// example test. To run these tests, uncomment this file along with the
// example resource in lib/ecw-stack.ts
// test('SQS Queue Created', () => {
// //   const app = new cdk.App();
// //     // WHEN
// //   const stack = new Ecw.EcwStack(app, 'MyTestStack');
// //     // THEN
// //   const template = Template.fromStack(stack);

// //   template.hasResourceProperties('AWS::SQS::Queue', {
// //     VisibilityTimeout: 300
// //   });
// });
jest.setTimeout(6000000)

test('Try fetch data', async () => {
    const date = new Date(2020, 1, 1)
    
    const sqs = new aws.SQS({
        region: "eu-west-1",
    })

    while (date.getTime() < new Date().getTime())
    {
        const tommorow = new Date()
        tommorow.setTime(date.getTime() + 86400000)
        await sqs.sendMessage({
            QueueUrl: "https://sqs.eu-west-1.amazonaws.com/876773868568/EcwStack-ecwgracefullImporterecwgracefulimportqueue0262EFF2-1XdUw8Eo2vah",
            MessageBody: JSON.stringify({to:tommorow, from:date}),
        }).promise()
        date.setTime(tommorow.getTime())
        
    }
});
