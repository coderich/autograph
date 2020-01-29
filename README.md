# AutoGraph
### Query your data like a graph.
:heavy_check_mark: [MongoDB](https://www.mongodb.com/)
:heavy_check_mark: [Neo4j](https://https://neo4j.com/)

**AutoGraph** provides a unified API to *query* and *mutate* backend data. Inspired by [GraphQL](https://graphql.org/), it's a *standalone data resolver* designed to represent your domain model as a connected graph.

Features include:

- Unified Query API
- Cursor Pagination
- Atomic Transactions
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))

:fire: If you're looking to build a GraphQL API, check out [AutoGraphQL](https://www.npmjs.com/package/@coderich/autographql)!

## Getting Started
First, install AutoGraph via NPM:

```sh
npm i @coderich/autograph --save
```

To get started, create a `Resolver`. Each `Resolver` provides a context to run queries for a given `Schema`.

```js
const { Resolver } = require('@coderich/autograph');

const resolver = new Resolver(schema);
```

That's it! Now you're ready to use the resolver to *query* and *mutate* data.

> Refer to the documentation below for how to define a schema.

## Resolving Data
Each `Resolver` treats your schema definition as a *graph of connected nodes*. To begin a *query* or *mutation*, you must first identify a node in the graph as your starting point.

##### .match
Identify a node, returns a `QueryBuilder`.
```
const queryBuilder = resolver.match('Person');
```
##### .transaction
Identify a node, returns a `Transaction`.
```
const txn = resolver.transaction('Person');
```