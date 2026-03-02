param name string
param location string
param storageAccountName string
param appInsightsConnectionString string
param cosmosEndpoint string
param cosmosDatabaseName string
param keyVaultName string

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource hostingPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${name}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp'
  properties: {
    reserved: false
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: hostingPlan.id
    httpsOnly: true
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${listKeys(storage.id, storage.apiVersion).keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          name: 'AZURE_COSMOS_ENDPOINT'
          value: cosmosEndpoint
        }
        {
          name: 'AZURE_COSMOS_DATABASE_NAME'
          value: cosmosDatabaseName
        }
        {
          name: 'KROGER_CLIENT_ID'
          value: '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}.vault.azure.net/secrets/KROGER-CLIENT-ID/)'
        }
        {
          name: 'KROGER_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}.vault.azure.net/secrets/KROGER-CLIENT-SECRET/)'
        }
        {
          name: 'KROGER_REDIRECT_URI'
          value: '@Microsoft.KeyVault(SecretUri=https://${keyVaultName}.vault.azure.net/secrets/KROGER-REDIRECT-URI/)'
        }
      ]
    }
  }
}

output functionEndpoint string = 'https://${functionApp.properties.defaultHostName}/api'
output principalId string = functionApp.identity.principalId
