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

const { supabase } = require('./db');

// Resolvers
const resolvers = {
    Asset: {
        children: async (parent) => {
            const { data } = await supabase.from('assets').select('*').eq('parentId', parent.id);
            return data;
        },
    },
    Query: {
        assets: async (_, { parentId }) => {
            let query = supabase.from('assets').select('*');
            if (parentId) {
                query = query.eq('parentId', parentId);
            } else {
                query = query.is('parentId', null);
            }
            const { data } = await query;
            return data;
        },
        searchAssets: async (_, { query }) => {
            if (!query) return [];
            const { data } = await supabase.from('assets').select('*').ilike('name', `%${query}%`);
            return data;
        },
        getAsset: async (_, { id }) => {
            const { data } = await supabase.from('assets').select('*').eq('id', id).single();
            return data;
        },
        getAssetPath: async (_, { id }) => {
            const path = [];
            let currentId = id;

            // Iteratively fetch parents (Max depth 5 for safety)
            for (let i = 0; i < 5; i++) {
                if (!currentId) break;
                const { data } = await supabase.from('assets').select('*').eq('id', currentId).single();
                if (!data) break;
                path.unshift(data);
                currentId = data.parentId;
            }
            return path;
        },
        getAssetsByIds: async (_, { ids }) => {
            const { data } = await supabase.from('assets').select('*').in('id', ids);
            return data;
        },
        snapshots: async () => {
            const { data } = await supabase.from('snapshots').select('*').order('createdAt', { ascending: false });
            return data;
        },
    },
    Mutation: {
        saveSnapshot: async (_, { name, activeSignalIds, hiddenSignalIds, dateRange, customColors }) => {
            const newSnapshot = {
                id: `snap-${Date.now()}`,
                name,
                createdAt: new Date().toISOString(),
                activeSignalIds,
                hiddenSignalIds,
                dateRange,
                customColors
            };
            const { data, error } = await supabase.from('snapshots').insert(newSnapshot).select().single();
            if (error) throw new Error(error.message);
            return data;
        },
        deleteSnapshot: async (_, { id }) => {
            const { error } = await supabase.from('snapshots').delete().eq('id', id);
            return !error;
        }
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
    cors: {
        origin: '*',
        credentials: false,
    }
});

server.listen({ port: process.env.PORT || 4001 }).then(({ url }) => {
    console.log(`🚀 Asset Service V3 (Port 4001) ready at ${url}`);

    // Start Live Ingestion (Background)
    console.log('⚡ Starting Live Data Generator...');
    require('./live_ingest');
});
