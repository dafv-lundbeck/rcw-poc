


//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isNotDefined = (data: any): boolean => data === undefined || data === null || Number.isNaN(data as any)

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prepareOutput = (data: any) => JSON.stringify(data, (_, v) => isNotDefined(v) ? 'N/A' : v).replace(" ", "").replace("\n","")