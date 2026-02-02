const pEnv = 'production'
const pEnvMap = {
  production: {
    BASE_SERVICE_URL: 'https://api.padolabs.org',
  },
  test: {
    BASE_SERVICE_URL: 'https://api-dev.padolabs.org',
  }
}


export const BASE_SERVICE_URL = pEnvMap[pEnv].BASE_SERVICE_URL