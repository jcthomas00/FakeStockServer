"use strict";
exports.__esModule = true;
exports.StockServer = void 0;
var express = require("express");
var cors = require("cors");
var http = require("http");
var StockServer = /** @class */ (function () {
    function StockServer() {
        this.maxmin = {};
        this.intervals = [];
        this.createApp();
        this.listen();
        this.createDummyData();
    }
    StockServer.prototype.myrand = function (max, min) {
        // max -= (25*this.randn_bm());
        // min += (25*this.randn_bm());
        // max -= (2.5*Math.random());
        // min += (2.5*Math.random());
        return Math.random() * (max - min) + min;
    };
    StockServer.prototype.randn_bm = function () {
        var u = 0, v = 0;
        while (u === 0)
            u = Math.random(); //Converting [0,1) to (0,1)
        while (v === 0)
            v = Math.random();
        var num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        num = num / 10.0 + 0.5; // Translate to 0 -> 1
        if (num > 1 || num < 0)
            return this.randn_bm(); // resample between 0 and 1
        return num;
    };
    StockServer.prototype.createDummyData = function () {
        var _this = this;
        StockServer.SYMBOLS.forEach(function (sym) {
            StockServer.dummyData[sym] = [];
            var orig = _this.myrand(200, 50);
            var max = orig;
            var min = max - 5;
            _this.maxmin[sym] = { max: max, min: min };
            var iterations = 100 * 24 * 60;
            var edge_var = 2;
            var time = new Date().setUTCHours(0, 0, 0, 0);
            var prevOpen = '', bool = true;
            var open = '';
            for (var i = 0; i < iterations; i++) {
                var high = "";
                var close_1 = "";
                var low = "";
                if (bool) {
                    bool = false;
                    var rands = [_this.myrand(max, min), _this.myrand(max, min)];
                    rands.sort();
                    open = rands[0].toFixed(2);
                    low = (rands[0] - (edge_var * Math.random())).toFixed(2);
                    close_1 = rands[1].toFixed(2);
                    high = (rands[1] + (edge_var * Math.random())).toFixed(2);
                }
                else {
                    var rand = +prevOpen + _this.myrand(2, -2);
                    if (rand < min) {
                        if (min > 20) {
                            min--;
                            max--;
                        }
                        rand = min + _this.myrand(1, 0);
                    }
                    if (rand > max) {
                        if (max < orig * 2) {
                            max++;
                            min++;
                        }
                        rand = max - _this.myrand(1, 0);
                    }
                    open = rand.toFixed(2);
                    low = ((rand < +prevOpen ? rand : +prevOpen) - (edge_var * Math.random())).toFixed(2);
                    close_1 = prevOpen;
                    high = ((rand > +prevOpen ? rand : +prevOpen) + (edge_var * Math.random())).toFixed(2);
                }
                StockServer.dummyData[sym].push({
                    timestamp: new Date(time - (i * 1000 * 60)),
                    open: open,
                    high: high,
                    low: low,
                    close: close_1
                });
                prevOpen = open;
            }
            var first = true;
            var interval = setInterval(function () {
                var close = "";
                var high = "";
                var low = "";
                var prevClose = StockServer.dummyData[sym][0].close;
                console.log(sym, _this.maxmin, max, min);
                if (first) {
                    first = false;
                    max = _this.maxmin[sym].max;
                    min = _this.maxmin[sym].min;
                    console.log(sym, _this.maxmin, max, min);
                }
                var rand = +prevClose + _this.myrand(2, -2);
                if (rand < min) {
                    if (min > 20) {
                        min--;
                        max--;
                    }
                    rand = min + _this.myrand(1, 0);
                }
                if (rand > max) {
                    if (max < orig * 2) {
                        max++;
                        min++;
                    }
                    rand = max - _this.myrand(1, 0);
                }
                close = rand.toFixed(2);
                high = ((rand > +prevClose ? rand : +prevClose) + (edge_var * Math.random())).toFixed(2);
                low = ((rand < +prevClose ? rand : +prevClose) - (edge_var * Math.random())).toFixed(2);
                StockServer.dummyData[sym].unshift({
                    timestamp: new Date(StockServer.dummyData[sym][0].timestamp.getTime() + (1000 * 60)),
                    open: prevClose,
                    high: high,
                    low: low,
                    close: close
                });
            }, 1000 * 60);
            _this.intervals.push(interval);
        });
        console.log(Object.keys(StockServer.dummyData), StockServer.dummyData["APPL"].length);
    };
    StockServer.prototype.createApp = function () {
        this.app = express();
        this.app.use(cors());
        this.server = http.createServer(this.app);
        this.port = process.env.PORT || StockServer.PORT;
        this.io = require('socket.io')(this.server, { cors: { origins: '*' } });
    };
    StockServer.prototype.getHistoricalData = function (obj) {
        console.log(obj, Object.keys(StockServer.dummyData));
        var output = {
            "response-type": "historical",
            data: []
        };
        if (!obj.symbols) {
            return output;
        }
        obj.symbols.forEach(function (element) {
            if (!StockServer.dummyData[element]) {
                output.data.push({
                    symbol: element,
                    data: []
                });
            }
            else {
                var len = StockServer.dummyData[element].length;
                var index = -1;
                console.log(StockServer.dummyData[element][0].timestamp >= new Date(obj.start));
                console.log(StockServer.dummyData[element][len - 1].timestamp >= new Date(obj.start));
                for (var i = len - 1; i >= 0; i--) {
                    if (StockServer.dummyData[element][i].timestamp >= new Date(obj.start)) {
                        index = i;
                        break;
                    }
                }
                console.log(StockServer.dummyData[element][0].timestamp, StockServer.dummyData[element][len - 1].timestamp);
                console.log(index, len);
                if (index != -1) {
                    output.data.push({
                        symbol: element,
                        data: StockServer.dummyData[element].slice(0, index)
                    });
                }
                else {
                    output.data.push({
                        symbol: element,
                        data: []
                    });
                }
            }
        });
        return output;
    };
    StockServer.prototype.getLiveData = function (sym) {
        var output = {
            "response-type": "live",
            "new-value": { symbol: sym, data: [] }
        };
        if (StockServer.dummyData[sym]) {
            output['new-value'].data.push(StockServer.dummyData[sym][0]);
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
                if (obj.symbols) {
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
                }
                else {
                    socket.emit('live', "Error! Invalid object");
                }
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
