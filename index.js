const { ApolloServer, gql } = require('apollo-server');

const typeDefs = gql`
  type Asset {
    id: ID!
    name: String!
    type: String!
    parentId: ID
    # Computed field
    children: [Asset]
  }

  type Query {
    # Get children of a specific parent. If parentId is null, returns root sites.
    assets(parentId: ID): [Asset]
    
    # Fuzzy search across all assets
    searchAssets(query: String!): [Asset]
    
    # Get a single asset by ID (useful for breadcrumb resolution)
    getAsset(id: ID!): Asset
    
    # Get breadcrumb path for an asset
    getAssetPath(id: ID!): [Asset]

    # Get multiple assets by IDs
    getAssetsByIds(ids: [ID!]!): [Asset]
    
    # List all saved snapshots
    snapshots: [Snapshot]
  }

  type Snapshot {
    id: ID!
    name: String!
    createdAt: String!
    activeSignalIds: [String]!
    hiddenSignalIds: [String]!
    dateRange: String!
    customColors: String
  }

  type Mutation {
    saveSnapshot(
      name: String!
      activeSignalIds: [String]!
      hiddenSignalIds: [String]!
      dateRange: String!
      customColors: String
    ): Snapshot
    deleteSnapshot(id: ID!): Boolean
  }
`;

// Dummy Data
const db = [
    // Sites
    { id: 'site-1', name: 'Texas Refinery', type: 'Site', parentId: null },
    { id: 'site-2', name: 'Louisiana Chemical', type: 'Site', parentId: null },

    // Plants
    { id: 'plant-1', name: 'Plant Alpha', type: 'Plant', parentId: 'site-1' },
    { id: 'plant-2', name: 'Plant Beta', type: 'Plant', parentId: 'site-1' },
    { id: 'plant-3', name: 'Plant Gamma', type: 'Plant', parentId: 'site-2' },

    // Trains
    { id: 'train-1', name: 'Train 101', type: 'Train', parentId: 'plant-1' },
    { id: 'train-2', name: 'Train 102', type: 'Train', parentId: 'plant-1' },

    // Units
    { id: 'unit-1', name: 'Crude Unit', type: 'Unit', parentId: 'train-1' },
    { id: 'unit-2', name: 'Vacuum Unit', type: 'Unit', parentId: 'train-1' },

    // Signal Containers
    { id: 'cont-1', name: 'Temperature Sensors', type: 'Signal Container', parentId: 'unit-1' },
    { id: 'cont-2', name: 'Pressure Sensors', type: 'Signal Container', parentId: 'unit-1' },

    // Signals
    { id: 'sig-1', name: 'TI-1001 Inlet Temp', type: 'Signal', parentId: 'cont-1' },
    { id: 'sig-2', name: 'TI-1002 Outlet Temp', type: 'Signal', parentId: 'cont-1' },
    { id: 'sig-3', name: 'PI-2001 Header Press', type: 'Signal', parentId: 'cont-2' },
    { id: 'sig-4', name: 'PI-2002 Suction Press', type: 'Signal', parentId: 'cont-2' },
];

// Snapshot Storage (In-Memory)
let snapshots = [];

const resolvers = {
    Asset: {
        children: (parent) => {
            // Return children for this parent
            return db.filter(asset => asset.parentId === parent.id);
        },
    },
    Query: {
        assets: (_, { parentId }) => {
            // If parentId is provided, filter by it. If null, return items with no parent (Sites).
            return db.filter(asset => asset.parentId === (parentId || null));
        },
        searchAssets: (_, { query }) => {
            if (!query) return [];
            const lowerQ = query.toLowerCase();
            // Simple fuzzy search (substring)
            return db.filter(asset => asset.name.toLowerCase().includes(lowerQ));
        },
        getAsset: (_, { id }) => {
            return db.find(asset => asset.id === id);
        },
        getAssetPath: (_, { id }) => {
            const path = [];
            let current = db.find(a => a.id === id);
            while (current) {
                path.unshift(current);
                current = db.find(a => a.id === current.parentId);
            }
            return path;
        },
        getAssetsByIds: (_, { ids }) => {
            console.log('getAssetsByIds called with:', ids);
            return db.filter(asset => ids.includes(asset.id));
        },
        snapshots: () => snapshots,
    },
    Mutation: {
        saveSnapshot: (_, { name, activeSignalIds, hiddenSignalIds, dateRange, customColors }) => {
            const newSnapshot = {
                id: `snap-${Date.now()}`,
                name,
                createdAt: new Date().toISOString(),
                activeSignalIds,
                hiddenSignalIds,
                dateRange,
                customColors
            };
            snapshots.push(newSnapshot);
            return newSnapshot;
        },
        deleteSnapshot: (_, { id }) => {
            const initialLength = snapshots.length;
            snapshots = snapshots.filter(s => s.id !== id);
            return snapshots.length < initialLength;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    cors: {
        origin: '*',
        credentials: true,
    }
});

server.listen({ port: 4001 }).then(({ url }) => {
    console.log(`🚀 Asset Service V3 (Port 4001) ready at ${url}`);
});
