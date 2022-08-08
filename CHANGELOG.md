# CHANGELOG

## v0.10.x
- Replaced ResultSet -> POJOs
  - Removed all $$ magic methods
  - Removed .toObject()
- Removed embedded API GQL concept
- Removed Directives [embedApi, resolve, @value]
- Removed toId Transform -> use @field(id: '')
- Removed Model.tform() -> use Model.hydrate(data, context)
- Changed Rule + Transform API
- Added .resolve() terminal command

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
