param name string
param location string
param sku string
@secure()
param repositoryToken string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryToken: empty(repositoryToken) ? null : repositoryToken
    publicNetworkAccess: 'Enabled'
  }
}

output defaultHostname string = 'https://${staticWebApp.properties.defaultHostname}'
