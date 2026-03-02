param name string
param location string
param databaseName string

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: name
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    disableKeyBasedMetadataWriteAccess: true
    publicNetworkAccess: 'Enabled'
  }
}

resource sqlDb 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  name: '${cosmos.name}/${databaseName}'
  properties: {
    resource: {
      id: databaseName
    }
  }
}

var containerNames = [
  'recipes'
  'ingredients'
  'mappings'
  'pantry'
  'mealPlans'
  'events'
]

resource containers 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = [for c in containerNames: {
  name: '${cosmos.name}/${sqlDb.name}/${c}'
  properties: {
    resource: {
      id: c
      partitionKey: {
        paths: [
          '/userId'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
        includedPaths: [
          {
            path: '/*'
          }
        ]
        excludedPaths: [
          {
            path: '/"_etag"/?'
          }
        ]
      }
    }
  }
}]

output endpoint string = cosmos.properties.documentEndpoint
output name string = cosmos.name
output id string = cosmos.id
