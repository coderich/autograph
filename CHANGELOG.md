# CHANGELOG

## v0.7.x
- TBD

## v0.6.x
- Mongo driver no longer checks for `version` directive
- Models no longer share a Connection type; removing the need to use `... on Model` for GraphQL queries
- Added `@field(connection: Boolean)` parameter to specifically indicate fields that should return a Connection type
