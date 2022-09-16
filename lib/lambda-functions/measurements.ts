import * as aws from 'aws-sdk'
import { Context, APIGatewayProxyResult } from 'aws-lambda'
import { KeepFocusApi } from '../business/keep-focus-api'
import { FlattenDTO, DTOS } from '../business/dto/keep-focus-dto'
import { prepareOutput } from '../business/auxiliary'
import { DateParams, FromYesterday } from '../business/dto/date-params'

const s3 = new aws.S3()
const { RESULT_BUCKET: resultBucket, KEEP_FOCUS_API_KEY: apiKey } = process.env


const uploadToS3 = async (key: string, data: any) => {
    // Upload to s3.
    try {
        const loc = await s3.upload({
            Bucket: resultBucket!,
            Key: key,
            Body: Buffer.from(prepareOutput(data), 'utf-8').toString(),
            ContentType: "application/json",
        }).promise()
        return loc
    } catch (err) {
        console.log(JSON.stringify(err))
        throw err
    }
}

const BatchUpload = async <T extends object>(type: string, data: DTOS<T>) => {
    data.data.forEach(x => uploadToS3(`${type}/${x.id}.json`, FlattenDTO(x)))
}

export const handler = async (event: any, _ctx: Context): Promise<APIGatewayProxyResult> => {
    
    if (apiKey == undefined) {
        throw new Error("The api key was not found. Is the api key registered as a secret?\n aws secretsmanager create-secret --name ecw_keepfocus_api_key --description \"The api key to be used for getting authorized with keep focus api\" --secret-string \"a very secret api key\"")
    }
    const api = new KeepFocusApi(apiKey!)
    
    const params: DateParams = event.body ?
             JSON.parse(event.body) : 
                event ? JSON.parse(event) : FromYesterday()
    

    console.log(`Preparing measurement collection for from: ${params.from} | to: ${params.to}`)

    const meters = (await api.Meters())
    BatchUpload("Meters", meters)

    let count = 0
    for (let i = 0; i < meters.data.length; i++) {
        const meter = meters.data[i];
        const measurements = await api.Measurements(meter.id, new Date(params.from), new Date(params.to))
        for (let j = 0; j < measurements.data.length; j++) {
            const measurement = measurements.data[j];
            measurement.id = meter.id
            count++
            uploadToS3(`Measurements/${meter.type}_${meter.id}_${measurement.attributes.time}.json`, FlattenDTO(measurement))
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            message: `Measurement collection has concluded with params = {from: ${params.from}, date: ${params.to}} and added ${count} new measurements`,
        }),
    };
    
}
