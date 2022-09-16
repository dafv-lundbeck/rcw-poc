import * as aws from 'aws-sdk'
import { Context } from 'aws-lambda'
import { KeepFocusApi } from '../business/keep-focus-api'
import { FlattenDTO, DTOS } from '../business/dto/keep-focus-dto'
import { prepareOutput } from '../business/auxiliary'

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

export const handler = async (event: any, _ctx: Context) => {
    
    if (apiKey == undefined) {
        throw new Error("The api key was not found. Is the api key registered as a secret?\n aws secretsmanager create-secret --name ecw_keepfocus_api_key --description \"The api key to be used for getting authorized with keep focus api\" --secret-string \"a very secret api key\"")
    }
    const api = new KeepFocusApi(apiKey!)
    BatchUpload("MeterTypes", (await api.MeterTypes()))
    BatchUpload("MeterTypes", (await api.MeterTypes()))
    BatchUpload("Instalations", (await api.Installations()))
    BatchUpload("MeterUseCodes", (await api.MeterUseCodes()))
    BatchUpload("MeterUnits", (await api.MeterUnit()))
    BatchUpload("UtilityResources", (await api.UtilityResources()))
    BatchUpload("UtilityCompanies", (await api.UtilityCompanies()))
}
