export interface List{
        symbols:string[],
        'response-type': "list"
}
export interface Historical{
    "response-type": "historical",
    data:
        { 
            symbol:string,
            data: DataPoint[]
        }[]
}
export interface Live{
        "response-type": "live",
        "new-value": { 
                symbol: string,
                data: DataPoint[]
        }
}

export interface DataPoint{
        timestamp: Date,
        open: string,
        high: string,
        low: string,
        close: string,
}