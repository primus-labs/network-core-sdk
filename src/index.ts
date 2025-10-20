import { ethers } from 'ethers';
import { SUPPORTEDCHAINIDS, SUPPORTEDCHAINIDSMAP, ONEMINUTE } from "./config/constants";
import { assemblyParams } from './assembly_params';
import { init, getAttestation, getAttestationResult, AlgorithmBackend } from "./primus_zk";
import { NodeContract } from "./classes/NodeContract";
import { TaskContract } from "./classes/TaskContract";
import { findFastestWs, resultToObject, formatErrFn } from "./utils";
import { TaskStatus, TaskResult, SubmitTaskReturnParams, AttestAfterSubmitTaskParams, TokenSymbol, RawAttestationResultList, PrimaryAttestationParams } from './types/index'
import { SDK_VERSION } from './version';
import { ZkAttestationError } from './classes/Error';
import { AttestationErrorCode } from 'config/error';

class PrimusNetwork {
  private provider!: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | ethers.providers.JsonRpcSigner;
  public supportedChainIds = SUPPORTEDCHAINIDS;
  private chainId!: number;
  // private _zktls: Zktls | undefined;
  private _taskContract: TaskContract | undefined;
  private _nodeContract: NodeContract | undefined;
  private _extendedData: Record<string, any> = {};

  async init(provider: any, chainId: number, mode: AlgorithmBackend = 'auto') {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.supportedChainIds.includes(chainId as number)) {
          return reject('chainId is not supported')
        }

        let formatProvider;
        let signer;

        if (provider instanceof ethers.providers.JsonRpcProvider) {
          formatProvider = provider;
        } else {
          if (provider?._isSigner) {
            formatProvider = provider?.provider;
            signer = provider;
          } else {
            formatProvider = new ethers.providers.Web3Provider(provider)
            signer = formatProvider.getSigner();
          }
        }

        const network = await formatProvider.getNetwork();
        const providerChainId = network.chainId;
        // console.log('init provider', provider, network)
        // console.log('init providerChainId', providerChainId, chainId)
        if (providerChainId !== chainId) {
          return reject(`Please connect to the chain with ID ${chainId} first.`)
        }

        this.provider = signer ?? formatProvider;
        this.chainId = chainId;
        // console.log('init chainId', this.chainId);
        await init(mode);
        const activeChainInfo = SUPPORTEDCHAINIDSMAP[chainId as keyof typeof SUPPORTEDCHAINIDSMAP]
        this._taskContract = new TaskContract(this.provider, activeChainInfo.taskContractAddress);
        this._nodeContract = new NodeContract(this.provider, activeChainInfo.nodeContractAddress);
        // console.log('init _nodeContract', this._nodeContract);
        return resolve(true);
      } catch (error) {
        return reject(error);
      }
    });
  }

  async submitTask(attestParams: PrimaryAttestationParams) {
    const { address } = attestParams;
    return new Promise(async (resolve, reject) => {
      try {
        const submitTaskParams = {
          templateId: '',
          address,
          attestorCount: 1
        }
        const submitTaskRes = await this._submitTask(submitTaskParams)
        // console.log('submitTask done', submitTaskRes)
        return resolve(submitTaskRes)
      } catch (error) {
        let formatErr = formatErrFn(error);
        return reject(formatErr);
      }
    })
  }

  private async _submitTask(submitTaskParams: PrimaryAttestationParams): Promise<SubmitTaskReturnParams> {
    // const { templateId, address, attestorCount = 1 } = submitTaskParams
    const { address } = submitTaskParams
    const attestorCount = 1
    return new Promise(async (resolve, reject) => {
      try {
        const taskRes = await this._taskContract?.submitTask(address, '', attestorCount)
        const taskTxHash = taskRes?.transactionHash as string;
        const taskTxData = TaskContract.parseTxEvent(taskRes, 'SubmitTask')
        const { taskId, attestors } = taskTxData as any
        const taskMetaInfo = {
          taskId,
          taskTxHash,
          taskAttestors: attestors
        }
        return resolve(taskMetaInfo)
      } catch (error) {
        return reject(error);
      }
    })
  }

  async attest(attestParams: AttestAfterSubmitTaskParams): Promise<RawAttestationResultList> {
    return new Promise(async (resolve, reject) => {
      try {
        const { taskId, taskTxHash, taskAttestors: attestorIds, ...attParams } = attestParams

        // 1.get attestors info
        const attestorsInfoArr = await Promise.all(attestorIds.map((id: string) => this._nodeContract?.getNodeInfo(id)))
        const attestorsUrlsArr = attestorsInfoArr.map((info: any) => info.urls)// [['api1', 'api2'], ['api2', 'api4']]
        // console.log('getNodesInfo done', attestorsInfoArr)
        // 2.Select the fastest URL for each selected node through speed testing.
        const attestorsUrlArr = await Promise.all(attestorsUrlsArr.map((attestorUrls) => findFastestWs(attestorUrls)))
        console.log('testSpeed done', attestorsUrlArr)
        // 3.Use the selected nodes to perform proofs sequentially.
        let attArr: RawAttestationResultList = []

        for (const api of attestorsUrlArr) {
          let extendedParamsObj = attParams.extendedParams ? JSON.parse(attParams.extendedParams) : {}
          Object.assign(extendedParamsObj, {
            taskId, taskTxHash, chainId: this.chainId,
            primusNetworkCoreSdkVersion: SDK_VERSION,
          })

          let formatAttParams = {
            ...attParams,
            algoDomain: api,
            extendedParams: JSON.stringify(extendedParamsObj)
          }
          const attestationParams = assemblyParams(formatAttParams);
          const submitStartTime = Date.now();
          const getAttestationRes = await getAttestation(attestationParams);
          // console.log('getAttestation:', getAttestationRes);
          if (getAttestationRes.retcode !== "0") {
            return reject(new ZkAttestationError('00001'))
          }
          const res: any = await getAttestationResult();
          // console.log('getAttestationResult:', JSON.stringify(res));
          const submitEndTime = Date.now();
          const submitTime = submitEndTime - submitStartTime;
          console.log('----------Attest algorithm duration:', submitTime);
          // console.log('getAttestationResult:', res);
          const { retcode, content, details } = res
          if (retcode === '0') {
            const { balanceGreaterThanBaseValue, signature, encodedData, extraData, extendedData } = content
            if (balanceGreaterThanBaseValue === 'true' && signature) {
              const encodedDataObj = JSON.parse(encodedData);
              encodedDataObj.attestation = JSON.parse(encodedDataObj.attestation);
              encodedDataObj.attestationTime = submitTime;
              encodedDataObj.attestorUrl = api;
              attArr.push(encodedDataObj);
              
              if (attestationParams.specialTask) {
                  this._extendedData[taskId] = extendedData;
              }
            } else if (!signature || balanceGreaterThanBaseValue === 'false') {
              let errorCode;
              if (
                extraData &&
                JSON.parse(extraData) &&
                ['-1200010', '-1002001', '-1002002'].includes(
                  JSON.parse(extraData).errorCode + ''
                )
              ) {
                errorCode = JSON.parse(extraData).errorCode + '';
              } else {
                errorCode = '00104';
              }
              return reject(new ZkAttestationError(errorCode as AttestationErrorCode, '', res))
            }
          } else if (retcode === '2') {
            const { errlog: { code } } = details;
            return reject(new ZkAttestationError(code, '', res))
          }
        }
        // console.log('attestationList from algorithm', attArr);
        return resolve(attArr);
      } catch (error) {
        return reject(error);
      }
    })
  }

  getExtendedData(taskId: string): any {
    return this._extendedData[taskId];
  }

  getAesKey(taskId: string): string | undefined {
  try {
      const extentedData = this._extendedData[taskId];
    if (!extentedData || (typeof extentedData === 'object' && Object.keys(extentedData).length === 0)) {
      console.warn("No extended data provided or it's empty");
      return undefined;
    }

    const ciphertext = typeof extentedData === 'string'
      ? JSON.parse(extentedData)
      : extentedData;

    const p = ciphertext.CompleteHttpResponseCiphertext 
           ?? ciphertext.PartialHttpResponseCiphertext;

    if (!p) {
      console.warn("No ciphertext found in extended data");
      return undefined;
    }

    const po = JSON.parse(p);

    return po?.packets?.[0]?.aes_key;
  } catch (err) {
    console.error("Failed to parse extended data:", (err as Error).message);
    return undefined;
  }
}

  async getReportTxReceipt(reportTxHash: string, confirmations: number = 1, timeoutMs: number = ONEMINUTE) {
    const hasWait = (this.provider as any)?.waitForTransaction;
    const baseProvider = hasWait ? (this.provider as any) : (this.provider as any)?.provider;
    if (!baseProvider || !baseProvider.waitForTransaction) {
      throw new Error('Provider is not initialized properly');
    }
    baseProvider.pollingInterval = 1000
    return baseProvider.waitForTransaction(reportTxHash, confirmations, timeoutMs);
  }

  async withdrawBalance(tokenSymbol = TokenSymbol.ETH, limit = 100) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this._taskContract?.withdrawBalance(tokenSymbol, limit)
        const taskTxData = TaskContract.parseTxEvent(res, 'WithdrawBalance')
        const { settledTaskIds } = taskTxData as any
        return resolve(settledTaskIds)
      } catch (error) {
        let formatErr = formatErrFn(error);
        // if (formatErr === '00016') {
        //   formatErr = new ZkAttestationError(formatErr)
        // }
        return reject(formatErr);
      }
    })
  }
  async queryRefundableTasks(address: string, tokenSymbol = TokenSymbol.ETH, offset = 0, limit = 100) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await this._taskContract?.queryUnsettledTasks(address, tokenSymbol, offset, limit)
        let obj = resultToObject(res)
        const taskInfos = obj.taskInfos
        console.log('queryUnsettledTasks', taskInfos)
        const taskTimeout = await this._taskContract?.queryTaskTimeout()
        let newArr = taskInfos.filter((i: any) => {
          // const { attestors, callback, submittedAt, submitter, taskResults, taskStatus, templateId, tokenSymbol } = i
          const taskTime = i.submittedAt.toNumber()
          console.log('taskTime', taskTime, taskTimeout)
          const refundable = Date.now() / 1000 - taskTime > (taskTimeout as number)
          return refundable
        })
        return resolve(newArr.length)
      } catch (error) {
        return reject(error)
      }
    })
  }


  // Verify & polling contract for task result by taskId
  async verifyAndPollTaskResult({ taskId, reportTxHash, intervalMs = 2000, timeoutMs = ONEMINUTE }: {
    taskId: string,
    reportTxHash?: string,
    intervalMs?: number,
    timeoutMs?: number
  }
  ): Promise<TaskResult[]> {
    const maxAttempts = timeoutMs / intervalMs;
    let attempts = 0;
    let blockNumber = 0;
    if (reportTxHash) {
      let reportTxReceipt = await this.getReportTxReceipt(reportTxHash)
      blockNumber = reportTxReceipt?.blockNumber ?? 0
    }


    return new Promise(async (resolve, reject) => {
      const formatTaskResultsFn = (taskResults: any) => {
        const fTR = taskResults.map((tr: any) => {
          const newTr = resultToObject(tr)
          newTr.attestation = resultToObject(newTr.attestation)
          newTr.attestation.request = newTr.attestation.request.map(resultToObject)
          newTr.attestation.responseResolve = newTr.attestation.responseResolve.map((i: any) => {
            const newI = resultToObject(i)
            newI.oneUrlResponseResolve = newI.oneUrlResponseResolve.map(resultToObject)
            return newI
          })
          newTr.attestation.timestamp = newTr.attestation.timestamp.toNumber()
          return newTr
        });
        return fTR
      };
      const fetchTaskDetail = async (): Promise<{
        taskStatus: TaskStatus;
        taskResults: any[];
      }> => {
        if (!this._taskContract) throw new Error('Task contract is not initialized');
        const rawDetail = await this._taskContract.queryTask(taskId, blockNumber);
        const detailObj = resultToObject(rawDetail);
        // console.log(`[verifyAndPollTaskResult] Task ${taskId} status: ${detailObj.taskStatus}`, detailObj);
        const { taskStatus = TaskStatus.INIT, taskResults = [] } = detailObj;
        return { taskStatus, taskResults };
      };
      const timerFn = () => {
        const timer = setInterval(async () => {
          attempts++;
          let taskStatus, taskResults
          try {
            const res = await fetchTaskDetail();
            taskStatus = res.taskStatus;
            taskResults = res.taskResults;

            if (taskStatus === TaskStatus.SUCCESS) {
              clearInterval(timer);
              const formatTaskResults = formatTaskResultsFn(taskResults)
              return resolve(formatTaskResults);
            }
            if (attempts >= maxAttempts) {
              if (taskStatus && [TaskStatus.PARTIAL_SUCCESS, TaskStatus.PARTIAL_SUCCESS_SETTLED].includes(taskStatus)) {
                clearInterval(timer);
                const formatTaskResults = formatTaskResultsFn(taskResults)
                return resolve(formatTaskResults);
              } else {
                clearInterval(timer);
                if (taskStatus && [TaskStatus.INIT, TaskStatus.FAILED].includes(taskStatus)) {
                  return reject(new Error("Polling fail"));
                }
                return reject(new Error("Polling timeout"));
              }
            }
          } catch (err) {
            // clearInterval(timer);
            // return reject(err);
            if (attempts >= maxAttempts) {
              if (taskStatus && [TaskStatus.PARTIAL_SUCCESS, TaskStatus.PARTIAL_SUCCESS_SETTLED].includes(taskStatus)) {
                clearInterval(timer);
                const formatTaskResults = formatTaskResultsFn(taskResults)
                return resolve(formatTaskResults);
              } else {
                clearInterval(timer);
                if (taskStatus && [TaskStatus.INIT, TaskStatus.FAILED].includes(taskStatus)) {
                  return reject(new Error("Polling fail"));
                }
                return reject(new Error("Polling timeout"));
              }
            }
          }
        }, intervalMs);
      }

      try {
        const initialDetail = await fetchTaskDetail()
        if (initialDetail?.taskStatus === TaskStatus.SUCCESS) {
          const formatTaskResults = formatTaskResultsFn(initialDetail?.taskResults)
          return resolve(formatTaskResults);
        } else {
          timerFn()
        }
      } catch {
        timerFn()
      }
    });
  }

}

export { PrimusNetwork };
