import { v4 as uuidv4 } from 'uuid';
import { AttNetworkRequest, AttNetworkResponseResolve, GenerateAttestationParams } from './types/index';

export function assemblyParams(att: GenerateAttestationParams) {
  const { requests, responseResolves, sslCipher, algoDomain,
    attMode, address: userAddress, additionParams, extendedParams, backUrl,
    noProxy, specialTask, getAllJsonResponse, mTLS } = att;
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
    if (noProxy || noProxy === undefined) {
      proxyUrl = ""; // only supported under mpctls model
    }
  }
  let timestamp = (+ new Date()).toString();
  const attestationParams = {
    specialTask, // undefined/PartialHttpResponseCiphertext/CompleteHttpResponseCiphertext
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
    cipher: sslCipher ? sslCipher : "ECDHE-RSA-AES128-GCM-SHA256",
    getAllJsonResponse, // "false"(default) or "true"
    client_crt: mTLS ? mTLS.clientCrt : "",
    client_key: mTLS ? mTLS.clientKey : "",
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


function _getField(parsePath: string, op?: string, parseType?: string) {
  const formatPath = parseType === 'html' ? parsePath.endsWith('?') ? parsePath : `${parsePath}?` : parsePath;
  if (op === "SHA256_EX") {
    return { "type": "FIELD_ARITHMETIC", "op": "SHA256", "field": formatPath };
  }
  return formatPath;
}
function _getOp(op?: string) {
  if (op === "SHA256_EX") {
    return "REVEAL_HEX_STRING";
  }
  return op ?? 'REVEAL_STRING';
}
function _getType(op?: string) {
  if (['>', '>=', '=', '!=', '<', '<=', 'STREQ', 'STRNEQ'].includes(op ?? "")) {
    return 'FIELD_RANGE';
  } else if (op === 'SHA256') {
    return "FIELD_VALUE"
  }
  return "FIELD_REVEAL"
}

function assemblyResponse(responseResolves: AttNetworkResponseResolve[][]) {
  return responseResolves.map(subArr => {
    const subconditions = subArr.map(({ keyName, parsePath, op, value, parseType }) => ({
      field: _getField(parsePath, op, parseType),
      reveal_id: keyName,
      op: _getOp(op),
      type: _getType(op),
      value
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

