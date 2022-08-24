# CHANGELOG

## v0.10.x
- Replaced ResultSet -> POJOs
  - Removed all $ magic field methods (auto populated)
  - Removed .toObject()
- Removed embedded API completely
- Removed Directives
  - embedApi -> no replacement
  - enforce -> use pipeline methods
  - resolve -> use graphql resolvers
  - @value -> use @field.instruct directive
- Removed toId Transform -> use @field(id: '')
- Removed Model.tform() -> use Model.shapeObject(shape, data)
- Removed Resolver.toResultSet() -> ? TBD ?
- Removed Transformer + Rule -> use Pipeline
  - Removed many pre-defined rules + transformers
  - Moved "validator" to dev dependency -> isEmail
- Added QueryBuilder.resolve() terminal command
- Exported SchemaDecorator -> Schema
- Removed embedded schema SystemEvents (internal emitter also removed)
- Removed spread of arguments in QueryBuilder terminal commands (must pass in array)
- Mutate "merged" instead of "input"
- Validate "payload"

## v0.9.x
- Subscriptions API
- postMutation no longer mutates "doc" and adds "result"
- Added onDelete defer option

## v0.8.x
- Engine 14+

## v0.7.x
- Complete overhaul of Query to Mongo Driver (pagination, sorting, counts, etc)
- Removed countModel Queries from the API (now available as `count` property on `Connetion` types)
- Dropped Neo4J (temporarily)

## v0.6.x
- Mongo driver no longer checks for `version` directive
- Models no longer share a Connection type; removing the need to use `... on Model` for GraphQL queries
- Added `@field(connection: Boolean)` parameter to specifically indicate fields that should return a Connection type
