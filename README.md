<img src="http://319aae5799f54c1fcefb-5ae98ed6e277c174e30e3abd5432b5c9.r57.cf2.rackcdn.com/dalmation.jpg" width="80px" align="left"/>

# @coderich/dalmatian
### A unified API for data access.
:heavy_check_mark: [MongoDB](https://www.mongodb.com/)
:heavy_check_mark: [Neo4j](https://https://neo4j.com/)

If you are looking to build a GraphQL API, check out [AutoGraph](https://www.npmjs.com/package/@coderich/autograph)!

**Dalmatian** is a unified API that treats disparate data models as one coherent graph. Inspired by [GraphQL](https://graphql.org/), it is a data *resolver* that executes and manages your queries. Features include:

- Full Query API
- Cursor Pagination
- Atomic Transactions
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))

## Getting Started
```
const resolver = new Dalmatian(schema);
```
