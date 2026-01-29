import { request } from '../utils/httpRequest';
import { BASE_SERVICE_URL } from '../config/env';
import type { ApiResponse, EventReportRawData, EventReportRequest } from './index.d';


export function reportEvent(rawDataObj: EventReportRawData): Promise<ApiResponse<any[]>> {
  const data: EventReportRequest = {
    eventType: "ATTESTATION_GENERATE",
    rawData: JSON.stringify(rawDataObj)
  };
  return request<ApiResponse<any[]>>({
    url: `${BASE_SERVICE_URL}/public/event/report`,
    method: 'POST',
    data: data
  });
}





