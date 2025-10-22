import { BigNumber } from 'ethers';

export type AttNetworkRequest = {
  url: string,
  header: object,
  method: string,
  body: any
}
export type AttNetworkResponseResolve = {
  keyName: string,
  parseType: string, //json or html
  parsePath: string,
  op?: string,
}
export type Attestor = {
  attestorAddr: string,
  url: string
}
export type Attestation = {
  recipient: string,
  request: AttNetworkRequest,
  responseResolve: AttNetworkResponseResolve[],
  data: string, // json string
  attConditions: string, // json string
  timestamp: number,
  additionParams: string,
  attestors: Attestor[],
  signatures: string[],
}
export type ErrorData = {
  code: string;
  title: string;
  desc: string;
}


export type AttModeAlgorithmType = 'mpctls' | 'proxytls'
export type AttModeResultType = 'plain' | 'cipher'
export type AttMode = {
  algorithmType: AttModeAlgorithmType;
  resultType: AttModeResultType;
}
export type PrimaryAttestationParams = {
  address: string;
}
export type BaseAttestationParams = {
  userAddress: string;
}
export type SeniorAttestationParams = {
  additionParams?: string;
  attMode?: AttMode;
  attConditions?: AttConditions;
  backUrl?: string;
  computeMode?: ComputeMode;
  extendedParams?: string;
  sslCipher?: AttSslCipher;
  noProxy?: boolean;
  specialTask?: string;
  getAllJsonResponse?: string;
}

export type AttestCommonParams = PrimaryAttestationParams & SeniorAttestationParams;

export type GenerateAttestationParams = AttestCommonParams & {
  algoDomain?: string;
  requests: AttNetworkRequest[];
  responseResolves: AttNetworkResponseResolve[][];
};


export type FullAttestationParams = BaseAttestationParams & SeniorAttestationParams & {
  timestamp: number;
  requestid?: string;
  algoApis: string[];
}
export type SignedAttRequest = {
  attRequest: FullAttestationParams,
}
// export type AttestParams = AttestCommonParams & {
//   // attestorCount?: number;
// }



export type ComparisonOp = '>' | '>=' | '=' | '!=' | '<' | '<=';
export type OpType = ComparisonOp | 'SHA256' | 'REVEAL_STRING';
export type AttSubCondition = {
  field: string,
  op: OpType,
  value?: string,
}
export type AttCondition = AttSubCondition[]
export type AttConditions = AttCondition[]
export type ComputeMode = 'nonecomplete' | 'nonepartial' | 'normal';
export type AttSslCipher = 'ECDHE-RSA-AES128-GCM-SHA256' | 'ECDHE-ECDSA-AES128-GCM-SHA256'

export enum NodeStatus {
  UNREGISTERED = 0, // Attestor Node not registered
  REGISTERED = 1,   // Attestor Node registered
}
export interface NodeInfo {
  status: NodeStatus;        // NodeStatus enum
  owner: string;             // address
  attestor: string;          // address
  recipient: string;         // address
  metaUrl: string;           // string
  urls: string[];            // string[]
  createTimestamp: bigint;   // uint256
  failureOrSuccessBitmap: bigint; // uint256
  lastFailureTimestamp: bigint;   // uint256
  failureCounter: bigint;    // uint256
  successCounter: bigint;    // uint256
}

export interface AttestationInContract {
  recipient: string; // The recipient of the attestation.
  request: AttNetworkRequest[]; // The network request send to datasource and related to the attestation.
  responseResolve: AttNetworkResponseResolve[]; // The response details responsed from datasource.
  data: string; // Real data in the pending body provided in JSON string format.
  attConditions: string; // Attestation parameters in JSON string format.
  timestamp: bigint; // The timestamp of when the attestation was created.
  additionParams: string; // Extra data for more inormation.
}

export interface TaskResult {
  taskId: string;
  attestor: string; // address
  attestation: AttestationInContract;
}

export enum TaskStatus {
  INIT = 0,
  SUCCESS = 1,
  PARTIAL_SUCCESS = 2,
  PARTIAL_SUCCESS_SETTLED = 3,
  FAILED = 4
}

export interface TaskInfo {
  templateId: string;
  submitter: string; // address
  attestors: string[]; // address[]
  taskResults: TaskResult[]; // TaskResult[]
  submittedAt: bigint; // uint64
  taskStatus: TaskStatus; // enum
  tokenSymbol: TokenSymbol; // enum
  callback: string;
}
// export type SubmitTaskParams = PrimaryAttestationParams & {
//   attestorCount?: number;
// }
export type SubmitTaskReturnParams = {
  taskId: string;
  taskTxHash: string;
  taskAttestors: string[];
}

export enum TokenSymbol {
  ETH
}
export enum ProgressStatus {
  INIT = 0,
  SUBMITTASKSUC = 1,
  ATTESTSUC = 2,
  QUERYTASKRESULTSUC = 3
}

export type FeeInfo = {
  primusFee: BigNumber;
  attestorFee: BigNumber;
  settedAt: BigNumber;
}

export type AttNetworkOneUrlResponseResolve = {
  oneUrlResponseResolve: AttNetworkResponseResolve[];
}

export type AttestAfterSubmitTaskParams = AttestCommonParams & SubmitTaskReturnParams & {
  requests: AttNetworkRequest[];
  responseResolves: AttNetworkResponseResolve[][];
}
export type AttestorRawResultMap = { [taskId: string]: RawAttestationResultList }
export type ProgressStatusMap = { [taskId: string]: ProgressStatus }

export type RawAttestationResult = {
  taskId: string;
  attestor: string;
  attestation: any;
  signature: string;
  reportTxHash: string;
}

export type AttestationResult = {
  taskId: string;
  attestor: string;
  attestation: any;
}

export type RawAttestationResultList = RawAttestationResult[]
export type AttestationResultList = AttestationResult[]