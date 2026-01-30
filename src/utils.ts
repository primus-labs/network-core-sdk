import { Attestation, AttNetworkRequest, AttNetworkResponseResolve } from './types/index'
// const { ethers } = require("ethers");
import { ethers } from "ethers";
import { PublicKey } from "@solana/web3.js";
import { JSDOM } from "jsdom";

export function isValidNumericString(value: string) {
  const regex = /^[0-9]*$/;
  return typeof value === 'string' && regex.test(value);
}
export function isValidLetterString(value: string) {
  const regex = /^[A-Za-z]+$/;
  return typeof value === 'string' && regex.test(value);
}

export function isValidNumberString(value: string) {
  const regex = /^(0\.(0*[1-9]\d{0,5})|[1-9]\d*(\.\d{1,6})?)$/;
  return typeof value === 'string' && regex.test(value);
}

export function isValidTimestampString(value: string) {
  // Check if the value is of string type  
  if (typeof value !== 'string') {
    return false;
  }

  // Attempt to parse the string into a number  
  const timestamp = Number(value);

  // Check if the parsed number is finite (not NaN or Infinity)  
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  // Check if the number is within a reasonable timestamp range (optional but recommended)  
  // JavaScript timestamps are typically milliseconds since 1970-01-01T00:00:00.000Z  
  // Minimum value is -62135596800000 (milliseconds since 1601-01-01T00:00:00.000Z, but many environments do not support such early times)  
  // Maximum value is Number.MAX_SAFE_INTEGER (2^53 - 1, approximately 9007199254740991 milliseconds, corresponding to the year 275760)  
  // Note: JavaScript Date objects can handle timestamps beyond this range, but may lose precision  
  const MIN_TIMESTAMP = -62135596800000; // Can be adjusted as needed  
  const MAX_TIMESTAMP = Number.MAX_SAFE_INTEGER;

  return timestamp >= MIN_TIMESTAMP && timestamp <= MAX_TIMESTAMP;
}

export function getInstanceProperties(instance: any) {
  const properties: any = {};
  Object.keys(instance).forEach(key => {
    // Only copy the attributes, not the methods
    if (typeof instance[key] !== 'function') {
      properties[key] = instance[key];
    }
  });
  return properties;
}

export function encodeSolanaAttestation(att: Attestation) {
  const encodedData = ethers.utils.solidityPack(
    ["bytes32", "bytes32", "bytes32", "string", "string", "uint64", "string"],
    [solanaAddressToBytes32(att.recipient), encodeRequest(att.request), encodeResponse(att.responseResolve),
    att.data, att.attConditions, att.timestamp, att.additionParams]
  );
  return ethers.utils.keccak256(encodedData);
}

export function encodeAttestation(att: Attestation) {
  if (isSolanaAddress(att.recipient)) {
    return encodeSolanaAttestation(att);
  } else {
    const encodedData = ethers.utils.solidityPack(
      ["address", "bytes32", "bytes32", "string", "string", "uint64", "string"],
      [att.recipient, encodeRequest(att.request), encodeResponse(att.responseResolve),
      att.data, att.attConditions, att.timestamp, att.additionParams]
    );
    return ethers.utils.keccak256(encodedData);
  }
}
export function encodeRequest(request: AttNetworkRequest) {
  const encodedData = ethers.utils.solidityPack(
    ["string", "string", "string", "string"],
    [request.url, request.header, request.method, request.body]
  );
  return ethers.utils.keccak256(encodedData);
}
export function encodeResponse(reponse: AttNetworkResponseResolve[]) {
  let encodeData = "0x";
  for (let i = 0; i < reponse.length; i++) {
    encodeData = ethers.utils.solidityPack(
      ["bytes", "string", "string", "string"],
      [encodeData, reponse[i].keyName, reponse[i].parseType, reponse[i].parsePath]
    );
  }
  return ethers.utils.keccak256(encodeData);
}

export async function sendRequest(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

export function isSolanaAddress(address: string) {
  try {
    const pk = new PublicKey(address);
    return PublicKey.isOnCurve(pk);
  } catch (e) {
    return false;
  }
}

function solanaAddressToBytes32(address: string) {
  const pubkey = new PublicKey(address);
  const bytes = pubkey.toBytes();
  return '0x' + Buffer.from(bytes).toString('hex');
}




export function isIpad() {
  const userAgent = navigator.userAgent.toLowerCase();
  const isTabletSize = window.innerWidth > 768 && window.innerWidth < 1366;

  return (
    /ipad/.test(userAgent) ||
    (navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 0 &&
      isTabletSize)
  );
};
export function isAndroid() {
  return navigator.userAgent.toLocaleLowerCase().includes("android")
}

export function isIos() {
  return navigator.userAgent.toLocaleLowerCase().includes("iphone") || isIpad();
}

export function getPlatformDevice() {
  let platformDevice = "pc";
  if (isAndroid()) {
    platformDevice = "android";
  } else if (isIos()) {
    platformDevice = "ios";
  }
  return platformDevice
}

export function findFastestWs(urls: string[], timeoutMs: number = 5000): Promise<string> {
  console.log('findFastestWs', urls)
  return new Promise((resolve, reject) => {
    if (urls?.length === 1) {
      return resolve(urls[0])
    }
    let settled = false;
    const sockets: WebSocket[] = [];

    // Start a timeout in case no connection is established
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        sockets.forEach(s => { try { s.close(); } catch { } });
        reject(new Error("Timeout: No WebSocket connection established"));
      }
    }, timeoutMs);

    urls.forEach((url) => {
      const ws = new WebSocket(`wss://${url}/algoproxy`);
      sockets.push(ws);

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(url);

          // Close all other connections
          sockets.forEach(s => { try { s.close(); } catch { } });
        }
      };

      ws.onerror = () => {
        // If all sockets are closed and no winner, reject
        if (!settled && sockets.every(s => s.readyState === WebSocket.CLOSED)) {
          clearTimeout(timer);
          settled = true;
          reject(new Error("All WebSocket connections failed"));
        }
      };
    });
  });
}

export function parseTxEvent(abi: any, receipt: any, eventName: string) {
  const iface = new ethers.utils.Interface(abi);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed.name === eventName) {
        return parsed.args;
      }
    } catch {
    }
  }
  return null;
}

export function resultToObject(result: any) {
  const obj: any = {};
  for (const key of Object.keys(result)) {
    if (isNaN(Number(key))) {
      obj[key] = result[key];
    }
  }
  return obj;
}

export function resultToObject2(result: any): any {
  if (result == null || typeof result !== "object") {
    return result;
  }
  const obj: any = {};
  for (const key of Object.keys(result)) {
    if (isNaN(Number(key))) {
      const value = result[key];
      obj[key] = resultToObject(value);
    }
  }
  return obj;
}
export const hasErrorFlagFn = (curErrorArr: string[], targetErrorStrArr: string[]) => {
  return curErrorArr.some((curErrorStr: string) => {
    let f = targetErrorStrArr.some(targetErrorStr => curErrorStr.toLowerCase().includes(targetErrorStr.toLowerCase()))
    return f
  })
}
export const getErrArrFn = (error: any) => {
  const errorMsg1 = typeof error === 'string'
    ? error
    : error instanceof Error
      ? error.message
      : typeof (error as any).message === 'string'
        ? (error as any).message
        : JSON.stringify(error);
  const errorMsg2 = typeof error === 'object' ? JSON.stringify(error) : error?.toString();
  const curErrorStrArr = [errorMsg1, errorMsg2]
  return curErrorStrArr
}

export const formatErrFn = (error: any) => {
  let formatError = error
  const curErrorStrArr = getErrArrFn(error)

  const userRejectErrStrArr = ['user rejected', 'approval denied']
  const isUserRejected = hasErrorFlagFn(curErrorStrArr, userRejectErrStrArr)
  if (error?.code === 'ACTION_REJECTED' || isUserRejected) {
    formatError = 'user rejected transaction'
  }

  const insufficientBalanceErrStrArr = ['insufficient balance', 'INSUFFICIENT_FUNDS', 'The caller does not have enough funds for value transfer.', 'insufficient lamports', 'Attempt to debit an account but found no record of a prior credit'] // 'unpredictable_gas_limit'
  const isInsufficientBalance = hasErrorFlagFn(curErrorStrArr, insufficientBalanceErrStrArr)
  if (isInsufficientBalance) {
    formatError = 'insufficient balance'
  }

  const noWithdrawTaskErrStrArr = ['No task fee can be withdrawn']
  const noWithdrawTask = hasErrorFlagFn(curErrorStrArr, noWithdrawTaskErrStrArr)
  if (noWithdrawTask) {
    formatError = 'Nothing to refund'
  }

  return formatError
}

export function parseHtmlByXPath(html: string, xpath: string): string | null {
  if (typeof html !== "string" || typeof xpath !== "string") {
    return null;
  }

  const dom = new JSDOM(html);
  const { document } = dom.window;
  const result = document.evaluate(
    xpath,
    document,
    null,
    dom.window.XPathResult.ANY_TYPE,
    null
  );

  if (result.resultType === dom.window.XPathResult.STRING_TYPE) {
    const value = result.stringValue.trim();
    return value.length > 0 ? value : null;
  }

  if (result.resultType === dom.window.XPathResult.NUMBER_TYPE) {
    return Number.isFinite(result.numberValue) ? String(result.numberValue) : null;
  }

  if (result.resultType === dom.window.XPathResult.BOOLEAN_TYPE) {
    return String(result.booleanValue);
  }

  const node = result.iterateNext();
  if (!node) {
    return null;
  }

  if (node.nodeType === dom.window.Node.ATTRIBUTE_NODE) {
    const value = (node as Attr).value?.trim();
    return value && value.length > 0 ? value : null;
  }

  const text = node.textContent?.trim();
  return text && text.length > 0 ? text : null;
}