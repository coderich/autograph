const Pipeline = require('../../src/data/Pipeline');

Pipeline.define('bookName', Pipeline.deny('The Bible'));
Pipeline.define('bookPrice', Pipeline.range(0, 100));
Pipeline.define('artComment', Pipeline.allow('yay', 'great', 'boo'));
Pipeline.define('colors', Pipeline.allow('blue', 'red', 'green', 'purple'));
Pipeline.define('buildingType', Pipeline.allow('home', 'office', 'business'));
Pipeline.define('networkID', ({ context }) => context.network.id, { ignoreNull: false });

module.exports = {
  typeDefs: `
    input PersonInputMeta {
      notify: Boolean
    }

    type Person
      @model(meta: "PersonInputMeta")
      @index(name: "uix_person_name", type: unique, on: [name])
    {
      age: Int @field(key: "my_age")
      name: String! @field(deserialize: toTitleCase, serialize: toLowerCase)
      authored: [Book] @link(by: author) @field(connection: true)
      emailAddress: String! @field(key: "email_address", validate: email)
      friends: [Person] @field(transform: dedupe, validate: selfless, onDelete: cascade, connection: true)
      status: String @field(key: "state")
      state: String @field(key: "address_state")
      telephone: String @field(default: "###-###-####")
      network: String @field(instruct: networkID)
      manipulate: String
      sections: [Section!]
    }

    type Book
      @model
      @index(name: "uix_book", type: unique, on: [name, author])
    {
      name: String! @field(transform: toTitleCase, validate: bookName)
      price: Float! @field(validate: bookPrice)
      author: Person! @field(validate: immutable, onDelete: cascade)
      bestSeller: Boolean
      bids: [Float]
      chapters: [Chapter] @link(by: book)
    }

    type Chapter
      @model
      @index(name: "uix_chapter", type: unique, on: [name, book])
    {
      name: String! @field(key: "chapter_name" transform: toTitleCase)
      book: Book! @field(onDelete: restrict)
      pages: [Page] @link(by: chapter)
    }

    type Page
      @model
      @index(name: "uix_page", type: unique, on: [number, chapter])
    {
      number: Int!
      verbage: String
      chapter: Chapter!
    }

    type BookStore
      @model
      @index(name: "uix_bookstore", type: unique, on: [name])
    {
      name: String! @field(transform: toTitleCase)
      location: String
      books: [Book] @field(onDelete: cascade)
      building: Building!
    }

    type Library
      @model
      @index(name: "uix_library", type: unique, on: [name])
      @index(name: "uix_library_bulding", type: unique, on: [building])
    {
      name: String! @field(transform: toTitleCase)
      location: String,
      books: [Book] @field(onDelete: cascade)
      building: Building!
    }

    type Apartment
      @model
      @index(name: "uix_apartment", type: unique, on: [name])
      @index(name: "uix_apartment_bulding", type: unique, on: [building])
    {
      name: String! @field(transform: toTitleCase)
      location: String
      building: Building!
    }

    type Building
    {
      year: Int @field(key: "year_built")
      type: String! @field(validate: buildingType)
      tenants: [Person] @field(onDelete: cascade)
      landlord: Person @field(onDelete: nullify)
      description: String @field(default: "A building from the bloom")
    }

    type Color
      @model
    {
      type: String! @field(validate: colors)
      isDefault: Boolean
    }

    type Art
      @model
    {
      name: String! @field(transform: toTitleCase)
      bids: [Float]
      comments: [String] @field(validate: artComment)
      sections: [Section]
    }

    type Section @model(embed: true) {
      name: String! @field(transform: toLowerCase)
      frozen: String! @field(default: "frozen", validate: immutable)
      description: String
      person: Person
    }

    type PlainJane @model {
      id: ID!
      name: String
    }
  `,
};
