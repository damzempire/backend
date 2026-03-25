const { ApolloServer } = require('apollo-server-express');
const { typeDefs } = require('./schema');
const { vaultResolver } = require('./resolvers/vaultResolver');
const { userResolver } = require('./resolvers/userResolver');
const { proofResolver } = require('./resolvers/proofResolver');
const { anchorResolver } = require('./resolvers/anchorResolver');
const { authMiddleware, vaultAccessMiddleware } = require('./middleware/auth');
const { adaptiveRateLimitMiddleware } = require('./middleware/rateLimit');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { applyMiddleware } = require('graphql-middleware');

const resolvers = {
  Query: {
    ...vaultResolver.Query,
    ...userResolver.Query,
    ...proofResolver.Query,
    ...anchorResolver.Query
  },
  Mutation: {
    ...vaultResolver.Mutation,
    ...userResolver.Mutation,
    ...proofResolver.Mutation
  },
  Vault: vaultResolver.Vault,
  Beneficiary: userResolver.Beneficiary
};

const executableSchema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const schemaWithMiddleware = applyMiddleware(
  executableSchema,
  adaptiveRateLimitMiddleware,
  vaultAccessMiddleware
);

const createApolloServer = () => {
  return new ApolloServer({
    schema: schemaWithMiddleware,
    context: ({ req, res }) => ({ req, res })
  });
};

module.exports = { createApolloServer };
