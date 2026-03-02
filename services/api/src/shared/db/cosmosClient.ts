import { CosmosClient, Container } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";

const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
const databaseName = process.env.AZURE_COSMOS_DATABASE_NAME || "kroger";

const containerNames = ["recipes", "ingredients", "mappings", "pantry", "mealPlans", "events"] as const;
type ContainerName = (typeof containerNames)[number];

const memoryStore = new Map<ContainerName, Map<string, any>>();
for (const c of containerNames) memoryStore.set(c, new Map());

let cosmosClient: CosmosClient | null = null;
if (endpoint) {
  cosmosClient = new CosmosClient({
    endpoint,
    aadCredentials: new DefaultAzureCredential()
  });
}

function memoryKey(userId: string, id: string): string {
  return `${userId}:${id}`;
}

export const db = {
  async list<T>(containerName: ContainerName, userId: string): Promise<T[]> {
    if (!cosmosClient) {
      return [...(memoryStore.get(containerName)?.values() || [])].filter((d: any) => d.userId === userId);
    }

    const container: Container = cosmosClient.database(databaseName).container(containerName);
    const { resources } = await container.items
      .query<T>({
        query: "SELECT * FROM c WHERE c.userId = @userId",
        parameters: [{ name: "@userId", value: userId }]
      })
      .fetchAll();
    return resources;
  },
  async getById<T>(containerName: ContainerName, userId: string, id: string): Promise<T | null> {
    if (!cosmosClient) {
      return (memoryStore.get(containerName)?.get(memoryKey(userId, id)) || null) as T | null;
    }

    const container = cosmosClient.database(databaseName).container(containerName);
    try {
      const { resource } = await container.item(id, userId).read<any>();
      return (resource as T) || null;
    } catch {
      return null;
    }
  },
  async upsert<T extends { id: string; userId: string }>(containerName: ContainerName, doc: T): Promise<T> {
    if (!cosmosClient) {
      memoryStore.get(containerName)?.set(memoryKey(doc.userId, doc.id), doc);
      return doc;
    }

    const container = cosmosClient.database(databaseName).container(containerName);
    const { resource } = await container.items.upsert<T>(doc);
    return resource as T;
  },
  async delete(containerName: ContainerName, userId: string, id: string): Promise<void> {
    if (!cosmosClient) {
      memoryStore.get(containerName)?.delete(memoryKey(userId, id));
      return;
    }

    const container = cosmosClient.database(databaseName).container(containerName);
    await container.item(id, userId).delete();
  }
};

