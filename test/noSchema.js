module.exports = {
  typeDefs: `
    scalar Mixed

    type Person {
      name: String!
      authored: [Book]
      emailAddress: String!
      status: String
    }

    type Book {
      name: String!
      price: Float!
      author: Person!
      bestSeller: Boolean
      bids: [Float]
    }
  `,
};