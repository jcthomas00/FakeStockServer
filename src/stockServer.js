"use strict";
exports.__esModule = true;
exports.StockServer = void 0;
var express = require("express");
var cors = require("cors");
var http = require("http");
var StockServer = /** @class */ (function () {
    function StockServer() {
        this.maxmin = {};
        this.createApp();
        this.listen();
        this.createDummyData();
    }
    StockServer.prototype.createDummyData = function () {
        var _this = this;
        StockServer.SYMBOLS.forEach(function (sym) {
            StockServer.dummyData[sym] = [];
            var max = Math.random() * (500 - 100) + 100;
            var min = max - 50;
            _this.maxmin[sym] = { max: max, min: min };
            var time = Date.now();
            var prevOpen = '', bool = true;
            var open = '';
            for (var i = 0; i < 100; i++) {
                var arr = [Math.random() * (max - min) + min, Math.random() * (max - min) + min, Math.random() * (max - min) + min];
                arr.sort();
                arr.reverse();
                open = arr[1].toFixed(2);
                StockServer.dummyData[sym].push({
                    timestamp: new Date(time - i * 86400000).toString(),
                    open: open,
                    high: arr[0].toFixed(2) > prevOpen ? arr[0].toFixed(2) : prevOpen,
                    low: arr[2].toFixed(2) < prevOpen || bool ? arr[2].toFixed(2) : prevOpen,
                    close: bool ? (Math.random() * (max - min) + min).toFixed(2) : prevOpen
                });
                bool = false;
                prevOpen = open;
            }
        });
    };
    StockServer.prototype.createApp = function () {
        this.app = express();
        this.app.use(cors());
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || StockServer.PORT;
        this.io = require('socket.io')(this.server, { cors: { origins: '*' } });
    };
    StockServer.prototype.getHistoricalData = function (obj) {
        var output = {
            "response-type": "historical",
            data: []
        };
        obj.symbols.forEach(function (element) {
            if (!StockServer.dummyData[element]) {
                output.data.push({
                    symbol: element,
                    data: []
                });
            }
            else {
                output.data.push({
                    symbol: element,
                    data: StockServer.dummyData[element].filter(function (dp) { return new Date(dp.timestamp) >= new Date(obj.start); })
                });
            }
        });
        return output;
    };
    StockServer.prototype.getLiveData = function (sym) {
        var output = {
            "response-type": "live",
            "new-value": { symbol: sym, data: [] }
        };
        if (!StockServer.dummyData[sym]) {
            //output['new-value'].data.push([])
        }
        else {
            var max = this.maxmin[sym].max, min = this.maxmin[sym].min;
            output['new-value'].data.push(StockServer.dummyData[sym][0]);
            var arr = [Math.random() * (max - min) + min, Math.random() * (max - min) + min, Math.random() * (max - min) + min];
            arr.sort();
            arr.reverse();
            StockServer.dummyData[sym].unshift({
                timestamp: new Date().toString(),
                open: StockServer.dummyData[sym][0].close,
                high: arr[0].toFixed(2) > StockServer.dummyData[sym][0].close ? arr[0].toFixed(2) : StockServer.dummyData[sym][0].close,
                low: arr[2].toFixed(2) < StockServer.dummyData[sym][0].close ? arr[2].toFixed(2) : StockServer.dummyData[sym][0].close,
                close: arr[1].toFixed(2)
            });
        }
        return output;
    };
    StockServer.prototype.listen = function () {
        var _this = this;
        this.server.listen(this.port, function () {
            console.log('Running server on port %s', _this.port);
        });
        this.io.on('connect', function (socket) {
            console.log("New Client Connected. Id: ".concat(socket.id));
            var lobby = '';
            var intervals = [];
            socket.on("disconnect", function () {
                intervals.forEach(function (item) {
                    clearInterval(item);
                });
            });
            /* List check */
            socket.on('list', function () { return socket.emit('list', {
                symbols: StockServer.SYMBOLS,
                'response-type': "list"
            }); });
            // Historical
            socket.on('historical', function (obj) { return socket.emit('historical', _this.getHistoricalData(obj)); });
            // Live
            socket.on('live', function (obj) {
                obj.symbols.forEach(function (sym) {
                    socket.emit('live', _this.getLiveData(sym));
                });
                var interval = setInterval(function () {
                    _this.io.allSockets().then(console.log);
                    obj.symbols.forEach(function (sym) {
                        socket.emit('live', _this.getLiveData(sym));
                    });
                }, 5000);
                intervals.push(interval);
            });
        });
    };
    StockServer.prototype.getApp = function () {
        return this.app;
    };
    StockServer.PORT = 8080; // Default local port
    StockServer.SYMBOLS = ['ABC', 'XYZ', 'LMNO', 'PQR', 'FACE', 'APPL'];
    StockServer.dummyData = {};
    return StockServer;
}());
exports.StockServer = StockServer;
