# AutoGraph
### A Featured-Rich GraphQL Framework

**AutoGraph** is a [GraphQL](https://graphql.org/) framework to help build and maintain a [Relay-Compliant Schema](https://relay.dev/docs/en/graphql-server-specification.html). It provides a *declarative*, *extensible*, and *best-practice* approach to schema design.

Feature Highlights:
- Instant Query + Mutation + Resolver Schema Stiching
- Declarative Schema Validation & Transformation
- Unified Data Access / Database Abstraction
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))
- Transactions, Pagination, and more!


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