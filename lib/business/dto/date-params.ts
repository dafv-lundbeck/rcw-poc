export interface DateParams{
    from: Date;
    to: Date;
}


const yesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate()-1)
    return yesterday;
}

export const FromYesterday = () => {
    const dates: DateParams = { from: yesterday(), to: new Date()}
}