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

To get started, you'll need to instantiate a `Schema` + `Resolver`:

```js
const { Schema, Resolver } = require('@coderich/dalmatian');
const mySchemaDef = require('./schemaDef');

const schema = new Schema(mySchemaDef); // Linchpin Schema
const resolver = new Resolver(schema); // Unified API Resolver
```

That's it! Now you're ready to start using the Resolver API to query your data.

> NOTE: Schemas are defined via the [Linchpin Schema]() definition
## Resolver API
