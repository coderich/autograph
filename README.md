<img src="http://319aae5799f54c1fcefb-5ae98ed6e277c174e30e3abd5432b5c9.r57.cf2.rackcdn.com/dalmation.jpg" width="170px" align="right"/>

# @coderich/dalmatian
### A Unified Data Query Resolver.
:heavy_check_mark: [MongoDB](https://www.mongodb.com/)
:heavy_check_mark: [Neo4j](https://https://neo4j.com/)

**Dalmatian** is a unified data query resolver. Inspired by [GraphQL](https://graphql.org/), it's goal is to connect and query multiple data sources as one coherent graph schema. Features include:


- Unified Query API
- Cursor Pagination
- Atomic Transactions
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))

:fire: If you're looking to build a GraphQL API, check out [AutoGraph](https://www.npmjs.com/package/@coderich/autograph)!

## Getting Started
First, install Dalmatian via NPM:

```sh
npm i @coderich/dalmatian --save
```

To get started, create a `Resolver`. Each `Resolver` provides a *context* to run queries for a given `Schema`.

```js
const { Resolver } = require('@coderich/dalmatian');

const resolver = new Resolver(schema); // Here 'schema' is a Linchpin Schema (see below)
```

That's it! Now you're ready to start using the resolver to query for data.

> NOTE: Refer to the [Linchpin Documentation]() for how to create a schema definition.

## Resolving Data
Each `Resolver` treats your schema definition as a *graph of connected nodes*. To begin a *query* or *mutation*, you must first identify a node in the graph as your starting point.

##### .spot
Identify a node, returns a `QueryBuilder`.
```
const queryBuilder = resolver.spot('Person');
```
##### .mark
Identify a node, returns a `Transaction`.
```
const txn = resolver.mark('Person');
```