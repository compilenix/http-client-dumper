/* eslint-disable */
const { IncomingMessage, RequestOptions } = require("http");
const { Buffer } = require("buffer");
/* eslint-enable */

const https = require("https");
const fs = require("fs-extra");
const mime = require("mime-types");

const dumpDir = "DumpedData";

/**
 * @param {IncomingMessage} httpResponse
 * @param {any} httpBody
 * @returns {boolean}
 */
function souldBeSavedToDisk(httpResponse, httpBody) {
    return httpResponse.statusCode === 200;
}

/**
 * @returns {RequestOptions}
 */
function createHttpRequestOptions() {
    // see https://nodejs.org/api/http.html#http_http_request_options_callback
    return {
        protocol: "https:",
        host: "www.plan.de",
        hostname: "www.plan.de",
        family: 4,
        port: 443,
        method: "GET",
        path: "/",
        headers: {
            "User-Agent": `compilenix/http-client-dumper (Node.js ${process.version})`,
        }
    };
}

/**
 * @param {IncomingMessage} httpResponse
 * @param {any} httpBody
 * @returns {string}
 */
function createDumpedDataFileName(httpResponse, httpBody) {
    return `${new Date().getTime()}_${httpResponse.statusCode}`;
}


// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------


function sleep( /** @type {Number} */ ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * @param {IncomingMessage} httpResponse
 * @param {any} httpBody
 */
async function writeResponseToDisk(httpResponse, httpBody) {
    const fileName = `${dumpDir}/${createDumpedDataFileName(httpResponse, httpBody)}`;
    /* eslint-disable no-console */
    console.log(`Write response to disk: ${fileName}`);
    await fs.appendFile(`${fileName}.json`, JSON.stringify({
        url: httpResponse.url,
        statusCode: httpResponse.statusCode,
        statusMessage: httpResponse.statusMessage,
        httpVersion: httpResponse.httpVersion,
        headers: httpResponse.headers,
        headersRaw: httpResponse.rawHeaders,
        tailers: httpResponse.trailers,
        trailersRaw: httpResponse.rawTrailers
    }, null, /* space */ 4));

    await fs.appendFile(`${fileName}.${mime.extension(httpResponse.headers["content-type"])}`, httpBody);
}

async function makeRequest() {
    return new Promise((resolve, reject) => {
        const request = https.request(createHttpRequestOptions(), async response => {
            response.setEncoding("utf8");

            let body = new Buffer([]);
            response.on("data", chunk => {
                body += chunk;
            });

            response.on("end", async () => {
                if (souldBeSavedToDisk(response, body)) {
                    await writeResponseToDisk(response, body);
                }

                resolve();
            });
        });

        request.on("error", error => {
            reject(error);
        });

        request.end(undefined, () => {
            resolve();
        });
    });
}

(async () => {
    await fs.ensureDir(dumpDir);
    /* eslint-disable no-constant-condition */
    while (true) {
        /* eslint-disable no-console */
        try { await makeRequest(); } catch (error) { console.error(error); }
        await sleep(1000);
    }
})();