# AutoGraph
### Instantly Build [Relay-Compliant](https://relay.dev/docs/en/graphql-server-specification.html) GraphQL APIs

**AutoGraph** is a powerful **framework** to *instantly* build **Relay-Compliant GraphQL APIs** that adhere to industry *standards* and *best-practices*. It provides a robust set of **directives** that encapsulates *data access*, *validation*, *transformations*, and so much more!


Feature Highlights:
- Instantly Connected Relay-Compliant GraphQL APIs
- Extensible Validation & Transformation Logic
- Unified Data Access / Abstraction Layer
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