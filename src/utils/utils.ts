import { defaultLogger, Logger } from '../logger';
import { reportEvent } from '../api';
import type { EventReportRawData } from '../api/index.d';


async function eventReport(rawDataObj: EventReportRawData, logger: Logger = defaultLogger) {
  try {
    await reportEvent(rawDataObj);
  } catch (error: any) {
    logger.error('event report failed:', error);
  }
}


export {
  eventReport
};
