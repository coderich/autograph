module.exports = {
  typeDefs: `
    type Person @model {
      name: String!
      authored: [Book]
      emailAddress: String!
      status: String @field(scope: private)
    }

    type Book @model {
      name: String!
      price: Float!
      author: Person!
      bestSeller: Boolean
      bids: [Float]
    }
  `,
};
