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
#### Custom Types
```gql
scalar AutoGraphMixed
enum AutoGraphScopeEnum { private protected public restricted }
enum AutoGraphOnDeleteEnum { cascade nullify restrict }
enum AutoGraphIndexEnum { unique }
```
#### Custom Directives
##### @model
| arg | type | description |
| :--- | :--- | :--- |
| `id` | `String` | Specify database id field name (default: `id`)
| `meta` | `String` | Define a model
| `alias` | `String` | Specify database table name (default models's name)
| `scope` | `AutoGraphScopeEnum` | Access scope for this model (default `protected`)
| `driver` | `String` | Specify database driver (default `default`)
| `namespace` | `String` | Define a custom namespace
| `createdAt` | `String` | TBD
| `updatedAt` | `String` | TBD

##### @field
| arg | type | description |
| :--- | :--- | :--- |
| `alias` | `String` | Specify database field name (default field's name)
| `scope` | `AutoGraphScopeEnum` | Access scope for this field (default `protected`)
| `enforce` | `[AutoGraphEnforceEnum!]` | List of `Rules` to enforce
| `noRepeat` | `Boolean` | TBD
| `onDelete` | `AutoGraphOnDeleteEnum` | Specify *onDelete* behavior
| `transform` | `[AutoGraphTransformEnum!]` | List of `Transformers` to apply
| `materializeBy` | `String` | Define a virtual field

##### @index
| arg | type | description |
| :--- | :--- | :--- |
| `on` | `[String!]!` | The field names to use for this index
| `type` | `AutoGraphIndexEnum!` | The type of index to create
| `name` | `String` | The name of the index

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