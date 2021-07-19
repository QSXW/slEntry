const http = require('http');
// const requestIp = require('request-ip');
const fs = require('fs');
const { EventEmitter } = require('events');
const { emit } = require('process');
const crypto = require('crypto');


let replyMessage = {
    ret: 0,
    data: {
        entry: {}
    }
};

let HEADERS = {
    server: 'sl',
    'Access-Control-Allow-Origin': '*',
    'Access-COntrol-Allow-Header': '*',
    "content-type": 'text/json; charset=utf-8'
};

let database = JSON.parse(fs.readFileSync('./database/primary.json')).entries;

const Token = {
    generate: (message) => {
        return crypto.createHmac('sha256', message).update((Math.random() * Date.now()).toString()).digest('hex').toUpperCase();
    }
};

const URLCodecs = {
    encode: (url, obj) => {
        url += '?';
        for (o in obj) {
            url += o + '=' + obj[o] + '&';
        }
        return url.substr(0, url.length - 1);
    },
    decode: (url) => {
        obj = {};
        args = url.split('?', 2);
        if (args.length > 1) {
            args[1].split('&').forEach(element => {
                seqs = element.split('=', 2);
                obj[seqs[0]] = seqs[1];
            });
        }
        return [args[0].substr(1, args[0].length), obj];
    }
};


function Reply(res, status, headers, data) {
    res.writeHead(status, headers);
    res.end(data);
}

const api = new EventEmitter();

api.on('log', (req) => {
    // console.log("有人发起了请求：", requestIp.getClientIp(req));
    console.log("请求链接: ", req.url);
});

api.on('reply', (res, status, headers, obj) => {
    res.writeHead(status, headers);
    res.end(JSON.stringify(obj));
});

api.on('parse', (req, res) => {
    let [u, p] = URLCodecs.decode(req.url);
    let statusCode = 404;

    let headers = HEADERS;

    if (database[u] != undefined) {
        replyMessage.ret = 0;
        replyMessage.data = database[u];
        statusCode = 200;
        headers.cookie = 'slid=' + Token.generate('sl') + ';';
    } else {
        replyMessage.ret = -1;
        replyMessage.data = {};
        statusCode = 403;
        delete headers.cookie;
    }
    api.emit('reply', res, statusCode, headers, replyMessage);
});

const apiServer = http.createServer((req, res) => {
    api.emit('log', req);
    let data = '';
    req.on('data', (chunk) => {
        data += chunk;
    });

    req.on('end', () => {
        api.emit('parse', req, res);
    });
}).listen(1114);

apiServer.on('error', (错误信息) => {
    console.log(错误信息);
});