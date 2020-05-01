# AutoGraph
### Instantly Build [Relay-Compliant](https://relay.dev/docs/en/graphql-server-specification.html) GraphQL APIs

**AutoGraph** is a powerful **framework** to *instantly* build **Relay-Compliant GraphQL APIs** that adhere to *standards and best practice*. It provides a robust set of **directives** that encapsulates *data access*, *validation*, *transformations*, and so much more!


##### Features include:
- Instantly Connected Relay-Compliant GraphQL APIs
- Extensible Validation & Transformation Logic
- Unified Data Access / Abstraction Layer
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))
- Transactions, Pagination, and more!

##### Installation:

```sh
npm i @coderich/autograph --save
```

## Schema API
#### Directives
###### @model
###### @field
###### @index

## Data API
##### Data Access
**Data Access**
##### Data Validation
##### Data Transformation


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