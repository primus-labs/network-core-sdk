import { v4 as uuidv4 } from 'uuid';
import { AttNetworkRequest, AttNetworkResponseResolve, GenerateAttestationParams } from './types/index';

export function assemblyParams(att: GenerateAttestationParams) {
    const { requests, responseResolves, sslCipher, algoDomain, attMode, address: userAddress, additionParams, extendedParams, backUrl } = att;
    const attRequest = {
        userAddress,
        additionParams,
        extendedParams,
        backUrl
    };
    let primusProxyUrl = `wss://${algoDomain}/algorithm-proxy`;
    let primusMpcUrl = `wss://${algoDomain}/algorithm`;
    let proxyUrl = `wss://${algoDomain}/algoproxy`;
    let padoUrl = primusProxyUrl;
    let modelType = "proxytls";
    let host = new URL(requests[0].url).host;
    const requestid = uuidv4();
    if (attMode?.algorithmType === "mpctls") {
        padoUrl = primusMpcUrl;
        modelType = "mpctls"
    }
    let timestamp = (+ new Date()).toString();
    const attestationParams = {
        source: "source", // not empty
        requestid,
        padoUrl,
        proxyUrl,
        getdatatime: timestamp,
        credVersion: "1.0.5",
        modelType, // one of [mpctls, proxytls]
        user: {
            userid: "0",
            address: userAddress,
            token: "",
        },
        authUseridHash: "",
        appParameters: {
            appId: "",
            appSignParameters: JSON.stringify(attRequest),
            appSignature: "",
            additionParams: additionParams || ''
        },
        reqType: "web",
        host,
        requests: assemblyRequest(requests),
        responses: assemblyResponse(responseResolves),
        templateId: "",
        padoExtensionVersion: "0.3.21",
        cipher: sslCipher? sslCipher : "ECDHE-RSA-AES128-GCM-SHA256",
    };
    return attestationParams;
}

function assemblyRequest(requests: AttNetworkRequest[]) {
    return requests.map(request => {
        const { url, header, method, body } = request;
        return {
            url,
            method,
            headers: { ...header, 'Accept-Encoding': 'identity' },
            body,
        };
    });
}

function assemblyResponse(responseResolves: AttNetworkResponseResolve[][]) {
    return responseResolves.map(subArr => {
        const subconditions = subArr.map(({ keyName, parsePath }) => ({
            field: parsePath,
            reveal_id: keyName,
            op: 'REVEAL_STRING',
            type: 'FIELD_REVEAL'
        }));
        return {
            conditions: {
                type: 'CONDITION_EXPANSION',
                op: '&',
                subconditions
            }
        };
    });
}

