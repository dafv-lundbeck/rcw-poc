
import axios, { AxiosInstance } from 'axios'
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import {DTOS, Installation, Measurement,Meter, MeterType, MeterUnit, MeterUseCode, UtilityCompany, UtilityResource} from './dto/keep-focus-dto'

export enum MeasurementType{
    Consumption = "consumption",
    Cost = "cost"
}

export enum MeasurementAggregation{
    Hourly = "hourly",
    Daily = "daily",
    Weekly = "weekly",
    Monthly = "monthly",
    Yearly = "yearly",
    Full = "full"
}


export class KeepFocusApi {

    private axiosClient: AxiosInstance
    private API_URL: string
    private API_VERSION: string
    private APIKEY: string

    constructor(api_key: string, api_url: string = "https://api.keepfocus.dk/", api_version: string = "v1"){
        this.API_URL = api_url
        this.API_VERSION = api_version
        this.APIKEY = api_key
    }

    
    private async ensureAuthorizedAxiosClient(){
        if (this.axiosClient == undefined || this.axiosClient == null){
            const jar = new CookieJar()
            const axClient = wrapper(axios.create({withCredentials: true, baseURL: this.API_URL, jar}))
            const response = await axClient.get('session/login?apikey='+this.APIKEY)
            if (response.status != 200) throw new Error("Could not authorize with keep focus api.")
            this.axiosClient = axClient
        }
    } 

    private async CallApi<T>(url: string): Promise<DTOS<T>>{
        await this.ensureAuthorizedAxiosClient()
        console.log("Calling api with URL: ", url)
        const response = await this.axiosClient.get<DTOS<T>>(url)
        if (response.status != 200){
            console.error("Could not fetch data from api: ", response.statusText)
            throw new Error("Could not fetch data from api: "+ response.statusText)
        } else{
            return response.data
        }
    }

    public async Installations(): Promise<DTOS<Installation>> {
        const installations = await this.CallApi<Installation>(this.API_VERSION+"/installations")
        return installations;
    }

    public async Meters(): Promise<DTOS<Meter>> {
        const meters = await this.CallApi<Meter>(this.API_VERSION+"/meters")
        return meters;
    } 

    public async MeterUseCodes(): Promise<DTOS<MeterUseCode>> {
        const meterUseCodes = await this.CallApi<MeterUseCode>(this.API_VERSION+"/meter-use-codes?locale-req=en")
        return meterUseCodes;
    } 

    public async MeterTypes(): Promise<DTOS<MeterType>> {
        const meterTypes = await this.CallApi<MeterType>(this.API_VERSION+"/meter-types?locale-req=en")
        return meterTypes;
    } 

    public async UtilityResources(): Promise<DTOS<UtilityResource>> {
        const utilityResource = await this.CallApi<UtilityResource>(this.API_VERSION+"/utility-resources?locale-req=en")
        return utilityResource;
    } 
 

    public async MeterUnit(): Promise<DTOS<MeterUnit>> {
        const meterUnit = await this.CallApi<MeterUnit>(this.API_VERSION+"/meter-units?locale-req=en")
        return meterUnit;
    } 

    public async UtilityCompanies(): Promise<DTOS<UtilityCompany>> {
        const utilityCompanu = await this.CallApi<UtilityCompany>(this.API_VERSION+"/utility-companies")
        return utilityCompanu;
    } 

    // Example curl:
    // curl -X GET --header "Accept: application/json" "https://api.keepfocus.dk/v1/meters/2886/measurements?from-time=11-09-2022&to-time=12-09-2022&time-aggr=hourly&measurement-type=consumption"
    public async Measurements(meterId: number, from: Date, to: Date = new Date(), measurementType: MeasurementType = MeasurementType.Consumption, timeAggr: MeasurementAggregation = MeasurementAggregation.Hourly): Promise<DTOS<Measurement>>{
        const query_url = `${this.API_VERSION}/meters/${meterId}/measurements?from-time=${from.toISOString()}&to-time=${to.toISOString()}&time-aggr=${timeAggr}&measurement-type=${measurementType}`
        const measurements = await this.CallApi<Measurement>(query_url)
        return measurements
    }
    
}

// Secret manager || parameter store

