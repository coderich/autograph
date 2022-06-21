module.exports = {
  resolvers: {
    Book: {
      name: () => 'The Great Book',
    },
  },

  typeDefs: `
    extend type Book {
      bids: [Float]
    }
  `,
};
