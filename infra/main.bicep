targetScope = 'resourceGroup'

@description('Deployment location')
param location string = resourceGroup().location

@description('Environment name')
param environmentName string = 'dev'

@description('Name prefix for resources')
param namePrefix string = 'krogerra'

@description('Static Web App SKU')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@secure()
@description('Static Web App GitHub token')
param staticWebAppGithubToken string = ''

var appInsightsName = '${namePrefix}-appi-${environmentName}'
var storageName = toLower(substring(replace('${namePrefix}st${environmentName}${uniqueString(resourceGroup().id)}', '-', ''), 0, 24))
var cosmosName = '${namePrefix}-cosmos-${environmentName}'
var keyVaultName = toLower(substring(replace('${namePrefix}-kv-${environmentName}-${uniqueString(resourceGroup().id)}', '-', ''), 0, 24))
var functionName = '${namePrefix}-func-${environmentName}'
var swaName = '${namePrefix}-swa-${environmentName}'

module appInsights './modules/appInsights.bicep' = {
  name: 'appInsightsDeploy'
  params: {
    name: appInsightsName
    location: location
  }
}

module storage './modules/storage.bicep' = {
  name: 'storageDeploy'
  params: {
    name: storageName
    location: location
  }
}

module cosmos './modules/cosmos.bicep' = {
  name: 'cosmosDeploy'
  params: {
    name: cosmosName
    location: location
    databaseName: 'kroger'
  }
}

module keyVault './modules/keyVault.bicep' = {
  name: 'keyVaultDeploy'
  params: {
    name: keyVaultName
    location: location
  }
}

module functionApp './modules/functionApp.bicep' = {
  name: 'functionDeploy'
  params: {
    name: functionName
    location: location
    storageAccountName: storage.outputs.storageAccountName
    appInsightsConnectionString: appInsights.outputs.connectionString
    cosmosEndpoint: cosmos.outputs.endpoint
    cosmosDatabaseName: 'kroger'
    keyVaultName: keyVault.outputs.name
  }
}

module staticWebApp './modules/staticWebApp.bicep' = {
  name: 'swaDeploy'
  params: {
    name: swaName
    location: location
    sku: staticWebAppSku
    repositoryToken: staticWebAppGithubToken
  }
}

resource cosmosDataRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-02-15-preview' = {
  name: '${cosmos.outputs.name}/${guid(cosmos.outputs.id, functionApp.outputs.principalId, 'cosmos-data-contributor')}'
  properties: {
    principalId: functionApp.outputs.principalId
    roleDefinitionId: '${cosmos.outputs.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    scope: cosmos.outputs.id
  }
}

output staticWebAppUrl string = staticWebApp.outputs.defaultHostname
output functionEndpoint string = functionApp.outputs.functionEndpoint
output cosmosEndpoint string = cosmos.outputs.endpoint
output keyVaultName string = keyVault.outputs.name
