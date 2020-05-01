# AutoGraph
### Instantly Build [Relay-Compliant](https://relay.dev/docs/en/graphql-server-specification.html) GraphQL APIs

**AutoGraph** is a powerful **framework** to *instantly* build **Relay-Compliant GraphQL APIs** that adhere to *standards and best practice*. It provides a robust set of **directives** that encapsulates *data access*, *validation*, *transformations*, and so much more!


#### Features
- Instantly Connected Relay-Compliant GraphQL APIs
- Extensible Validation & Transformation Logic
- Unified Data Access / Abstraction Layer
- Memoized Caching (via [DataLoader](https://www.npmjs.com/package/dataloader))
- Transactions, Pagination, and more!

#### Installation

```sh
npm i @coderich/autograph --save
```

## Schema API
#### Directives
##### @model
| arg | value | description |
| :--- | :--- | :--- |
| `id` | `String` | Define a model
| `meta` | `String` | Define a model
| `alias` | `String` | Define a model
| `scope` | `AutoGraphScopeEnum` | Define a model
| `driver` | `String` | Define a model
| `namespace` | `String` | Define a model
| `createdAt` | `TIMESTAMP` | Define a model
| `updatedAt` | `TIMESTAMP` | Define a model

```graphql
enum AutoGraphScopeEnum { private protected public restricted }
```


##### @field
| arg | value | description |
| :--- | :--- | :--- |
| `alias` | `String` | Define a model
| `scope` | `AutoGraphScopeEnum` |  Define a model
| `enforce` | `[AutoGraphEnforceEnum!]` | Define a model
| `noRepeat` | `Boolean` | Define a model
| `onDelete` | `AutoGraphOnDeleteEnum` | Define a model
| `transform` | `[AutoGraphTransformEnum!]` | Define a model
| `materializeBy` | `String` | Define a model

```gql
enum AutoGraphScopeEnum { private protected public restricted }
enum AutoGraphOnDeleteEnum { cascade nullify restrict }
```

##### @index
| arg | value | description |
| :--- | :--- | :--- |
| `on` | `[String!]!` | Define a model
| `type` | `{ unique }!` | Define a model
| `name` | `String` | Define a model

## Data API
#### Data Access
#### Data Validation
#### Data Transformation


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