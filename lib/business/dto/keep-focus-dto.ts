import { domainToASCII } from "url";

export interface Installation {
    'customer-id': number;
    name: string;
    address: string;
    zipcode: string;
    city: string;
    timezone: string;
}

export interface Meter {
    
    'installation-id': number;
    name: string;
    'meter-type-id': number;
    'utility-company-id': number;
    'internal-reference': string;
    notes: string;
    'system-type': string;
    'parent-meter-id': number;
    location: string;
    'grid-supply': boolean;
    'use-code': number;
    'unit-id': number;
    'active-source-meter-id': number;
    'extra-data': string;
    'supply-meter-number': string;
}


export interface Measurement {
    time: Date;
    value: number;
    unit: string;
}

export interface MeterUnit {
    shortname: string;
    longname: string;
}

export interface MeterType {
    name: string;
}

export interface MeterUseCode {
    'meter-type-id':number;
    name: string;
}

export interface UtilityResource{
    name:string;
}

export interface UtilityCompany{
    "customer-id": number;
    "name": string;
    "meter-unit-id": number;
    "meter-type-id": number;
    "utility-resource-id": number;
}

export interface DTO<T> {
    id: number;
    type: string;
    attributes: T;
}

export interface DTOS<T> {
    data: DTO<T>[];
}

export const FlattenDTO = <T extends object>(ob: DTO<T>) => {
    const result: Record<string, any> = {};
    result["id"] = ob.id
    result["type"] = ob.type
    Object.keys(ob.attributes).forEach( x=> result[x] = (ob.attributes as any)[x])
    return result;
}

export const FlattenDTOS = <T extends object>(objs: DTOS<T>) => {
    return objs.data.map(x => FlattenDTO(x))
}



