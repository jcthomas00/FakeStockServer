import * as express from 'express'
import * as cors from 'cors'
import * as http from 'http'
import * as SocketIO from 'socket.io'
import * as Interfaces from './Interfaces'

export class StockServer {

    public static readonly PORT: number = 8080 // Default local port
    public static readonly SYMBOLS: string[] = ['ABC', 'XYZ', 'LMNO', 'PQR', 'FACE', 'APPL'];

    public static dummyData:{[symbol:string]:Interfaces.DataPoint[]} = {}

    private app: express.Application
    private server: http.Server
    private io: SocketIO.Server
    private port: string | number

    private maxmin: {[symbol:string]: {max: number, min: number}} = {};
    private intervals: NodeJS.Timer[] = [];

    constructor() {
        this.createApp()
        this.listen()
        this.createDummyData()
    }

    private createDummyData(): void
    {
        StockServer.SYMBOLS.forEach((sym) => {
            StockServer.dummyData[sym] = [];

            const max = Math.random() * (500 - 100) + 100;
            const min = max - 50;

            this.maxmin[sym] = {max: max, min: min};

            const iterations = 100 * 24 * 60;

            const time = Date.now()
            let prevOpen = '', bool = true;
            let open = '';
            for(let i = 0; i<iterations; i++){
                let arr = [Math.random()*(max - min) + min, Math.random()*(max - min) + min, Math.random()*(max - min) + min];
                arr.sort();
                arr.reverse();
                open = arr[1].toFixed(2);
                StockServer.dummyData[sym].push({
                    timestamp: new Date(time-(i*1000*60)),
                    open: open,
                    high:  arr[0].toFixed(2) > prevOpen ? arr[0].toFixed(2) : prevOpen,
                    low:  arr[2].toFixed(2) < prevOpen || bool ? arr[2].toFixed(2) : prevOpen,
                    close:  bool ? (Math.random()*(max - min) + min).toFixed(2):prevOpen
                })
                bool = false;
                prevOpen = open;
            }

            let interval = setInterval(() => {
                let arr = [Math.random()*(max - min) + min, Math.random()*(max - min) + min, Math.random()*(max - min) + min];
                arr.sort();
                arr.reverse();
                StockServer.dummyData[sym].unshift({
                    timestamp: new Date(StockServer.dummyData[sym][0].timestamp.getTime() + (1000*60)),
                    open: StockServer.dummyData[sym][0].close,
                    high:  arr[0].toFixed(2) > StockServer.dummyData[sym][0].close ? arr[0].toFixed(2) : StockServer.dummyData[sym][0].close,
                    low:  arr[2].toFixed(2) < StockServer.dummyData[sym][0].close ? arr[2].toFixed(2) : StockServer.dummyData[sym][0].close,
                    close:  arr[1].toFixed(2)
                })
            }, 1000*60);

            this.intervals.push(interval);
        })

        console.log(Object.keys(StockServer.dummyData), StockServer.dummyData["APPL"].length);
    }

    private createApp(): void {
        this.app = express()
        this.app.use(cors())
        this.server = http.createServer(this.app)
        this.port = process.env.PORT || StockServer.PORT
        this.io = require('socket.io')(this.server, { cors: { origins: '*' } })
    }

    private getHistoricalData(obj): Interfaces.Historical
    {
        console.log(obj, Object.keys(StockServer.dummyData));
        const output:Interfaces.Historical = {
            "response-type": "historical",
            data:[]
        };
        if (!obj.symbols)
        {
            return output;
        }

        obj.symbols.forEach(element => {
            if (!StockServer.dummyData[element])
            {
                output.data.push({
                    symbol: element, 
                    data: []
                })
            }
            else
            {
                let len = StockServer.dummyData[element].length;
                let index = -1;
                for (let i = len-1; i >= 0; i--)
                {
                    if (StockServer.dummyData[element][i].timestamp < obj.start)
                    {
                        index = i;
                        break;
                    }
                }
                console.log(StockServer.dummyData[element][0].timestamp, StockServer.dummyData[element][len-1].timestamp)
                console.log(index, len);

                if (index != -1)
                {
                    output.data.push({
                        symbol: element, 
                        data: StockServer.dummyData[element].slice(0, index),
                    })
                }
                else
                {
                    output.data.push({
                        symbol: element, 
                        data: []
                    })
                }

            }
        });
        return output;
    }

    private getLiveData(sym):Interfaces.Live 
    {
        const output: Interfaces.Live = {
            "response-type": "live",
            "new-value": {symbol: sym, data: []},
        };

        if (StockServer.dummyData[sym])
        {
            output['new-value'].data.push(StockServer.dummyData[sym][0])
        }
       
        return output;
    }

    private listen(): void {
        this.server.listen(this.port, () => {
            console.log('Running server on port %s', this.port)
        })

        this.io.on('connect', (socket: any) => {
            console.log(`New Client Connected. Id: ${socket.id}`)
            let lobby: string = ''
            let intervals = [];

            socket.on("disconnect", () => {
                intervals.forEach(item => {
                    clearInterval(item);
                });
            });

            /* List check */
            socket.on('list', () => socket.emit('list', {
                symbols: StockServer.SYMBOLS,
                'response-type': "list"
            }))

            // Historical
            socket.on('historical', (obj) => socket.emit('historical', this.getHistoricalData(obj)))

            // Live
            socket.on('live', (obj) => {
                if (obj.symbols)
                {
                    obj.symbols.forEach(sym => {
                        socket.emit('live', this.getLiveData(sym))
                    });
                    let interval = setInterval(()=>{
                        this.io.allSockets().then(console.log);
                        obj.symbols.forEach(sym => {
                            socket.emit('live', this.getLiveData(sym))
                        });
                    },5000)
    
                    intervals.push(interval);
                }
                else
                {
                    socket.emit('live', "Error! Invalid object");
                }
            })
        })
    }

    public getApp(): express.Application {
        return this.app
    }
}