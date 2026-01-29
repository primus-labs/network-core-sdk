import { machineId } from 'node-machine-id';
import { randomUUID } from 'crypto';
import { reportEvent } from '../api';
import type { EventReportRawData } from '../api/index.d';

/**
 * Get device unique and fixed deviceId
 * @param raw - Whether to return raw ID (true) or formatted UUID (false), defaults to false
 * @returns Promise<string> Device unique ID
 */
export async function getDeviceId(raw = false): Promise<string> {
  try {
    // Get device unique identifier (async)
    const id = await machineId(raw);
    return id;
  } catch (error: any) {
    // Fallback: generate a temporary random ID (only used when device ID retrieval fails)
    console.error('Failed to get deviceId:', error?.message || error);
    return randomUUID();
  }
}

async function eventReport(rawDataObj: EventReportRawData) {
  try {
    await reportEvent(rawDataObj);
  } catch (error: any) {
    console.error('event report failed:', error);
  }
}


export {
  eventReport
};
