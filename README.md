<img src="http://319aae5799f54c1fcefb-5ae98ed6e277c174e30e3abd5432b5c9.r57.cf2.rackcdn.com/dalmation.jpg" width="80px" align="left"/>

# @coderich/dalmatian
### Unified Data Access.
:heavy_check_mark: [MongoDB](https://www.mongodb.com/)
:heavy_check_mark: [Neo4j](https://https://neo4j.com/)

**Dalmatian** is a unified data access layer (DAL) abstraction. Inspired by [GraphQL](https://graphql.org/), it represents your domain model as a coherent graph of connected nodes (spots). Features include:


- Full Query API
- Cursor Pagination
- Atomic Transactions
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))

:fire: If you're looking to build a GraphQL API, check out [AutoGraph](https://www.npmjs.com/package/@coderich/autograph)!

## Getting Started
First, install Dalmatian via NPM:
```
npm i @coderich/dalmatian --save
```
To get started, create a `Schema`. A `Schema` may define all (or some) of your domain model.

Next, create a `Resolver`. A `Resolver` provides a unified API to a given `Schema`.

#### Schema

#### Resolver

## API