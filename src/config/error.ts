export type AttestationErrorCode =
  '00000' | '00001' | '00002' | '00003' | '00004' | '00005' | '00015' |
  '00104' |
  '10001' | '10002' | '10003' | '10004' |
  '20001' | '20002' | '20003' | '20004' | '20005' |
  '30001' | '30001:301' | '30001:302' | '30001:401' | '30001:403' | '30001:404' | '30001:429' | '30002' | '30003' | '30004' | '30005' | '30006' |
  '40001' | '40002' |
  '50000:501' | '50000:502' | '50003' | '50004' | '50000:505' | '50006' | '50000:507' | '50000:508' | '50009' | '50000:510' | '50011' |
  '99999' | '99999:001' |
  '-500' | '-10101' | '-10102' | '-10103' | '-10104' | '-10105' | '-10106' | '-10107' | '-10108' | '-10109' | '-10110' | '-10111'


export type ErrorCode = AttestationErrorCode

/** Maps algorithm errlog codes to NOTE_V2-style `50000:subCode` keys. */
export const ALGO_ERR_NORMALIZE_TO_50000: Record<number, string> = {
  50001: '501',
  50002: '502',
  50005: '505',
  50007: '507',
  50008: '508',
  50010: '510',
};

export const ErrorCodeMAP = {
  '00000': 'Too many requests. Please try again later.',
  '00001': 'Failed to start the algorithm. Please refresh the page, then try again.',
  '00002': 'The verification process timed out. Please try again later.',
  '00003': 'Verification is in progress. Please try again later.',
  '00004': 'Verification was cancelled by the user.',
  '00005': 'Invalid SDK parameters.',
  '00015': 'Invalid algorithm parameters.',
  '00104': 'Verification requirements not met.',
  '10001': 'Unstable internet connection. Please try again later.',
  '10002': 'Network connection interrupted during attestation. Please try again later.',
  '10003': 'Connection to the attestation server was interrupted during processing. Please try again later.',
  '10004': 'Connection to the data source server was interrupted during processing. Please try again later.',
  '20001': 'Internal runtime error: LengthException. Contact Primus Team for assistance.',
  '20002': 'Internal runtime error: OutOfRangeException. Contact Primus Team for assistance.',
  '20003': 'Invalid algorithm parameters.',
  '20004': 'Internal runtime error: LogicError. Contact Primus Team for assistance.',
  '20005': 'Runtime error: NotDefined. Contact Primus Team for assistance.',
  '30001': 'Response error. Please try again later.',
  '30001:301': 'Request URL not detected. Contact Primus Team for assistance.',
  '30001:302': 'Response error. Please try again later.',
  '30001:401': 'Session expired. Please log in again.',
  '30001:403': 'Access blocked due to the data source server\'s risk control. Please try again later.',
  '30001:404': 'Request URL not detected. Contact Primus Team for assistance.',
  '30001:429': 'Rate limited by the data source server due to excessive requests from this user. Please try again later.',
  '30002': 'Response validation error. Please try again later.',
  '30003': 'Response parsing error. Please try again later.',
  '30004': 'JSON parsing error. Contact Primus Team for assistance.',
  '30005': 'HTML parsing error. Contact Primus Team for assistance.',
  '30006': 'Preset path key not found in the response. Contact Primus Team for assistance.',
  '40001': 'Internal error: FileNotExistException. Contact Primus Team for assistance.',
  '40002': 'SSL certificate error. Contact Primus Team for assistance.',
  '50000:501': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50000:502': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50003': 'The client encountered an unexpected error. Please try again later.',
  '50004': 'The client did not start correctly. Please try again later.',
  '50000:505': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50006': 'Algorithm server not started. Please try again later.',
  '50000:507': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50000:508': 'Internal algorithm error. Contact Primus team for assistance.',
  '50009': 'Algorithm service timed out. Please try again later.',
  '50000:510': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50011': 'Unsupported TLS version. Contact Primus Team for assistance.',
  '99999': 'Undefined error. Please try again later.',
  '99999:001': 'Undefined error. Please try again later.',
  '-500': 'Unexpected attester node service failure. Please try again later.',
  '-10101': 'This task has already been completed. No need to resubmit.',
  '-10102': 'This task is still in progress. No need to resubmit.',
  '-10103': 'Submission attempt limit reached (15 attempts) for this task. Start a new task to continue.',
  '-10104': 'Failed to fetch task details. Please check network status or task ID, then try again.',
  '-10105': 'Invalid attestation parameters. Please check the connection between the node and template server.',
  '-10106': 'Attestation template ID mismatch between task and server.',
  '-10107': 'Attestation template ID mismatch in submission.',
  '-10108': 'Invalid task ID. Please check and ensure the submitted ID matches the task.',
  '-10109': 'Task was terminated due to a network fee issue. Please start a new task.',
  '-10110': 'Attester node mismatch. Please ensure the node matches the task requirements and resubmit.',
  '-10111': 'Submission time limit reached (15 minutes). Start a new task to continue.',
};

