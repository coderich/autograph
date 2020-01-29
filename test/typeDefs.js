module.exports = `
  type Person
    @quin(indexes: [{ name: "uix_person_name", type: unique, on: "name" }])
  {
    # id: ID!
    name: String! @quin(transform: titleCase)
    authored: [Book] @quin(materializeBy: "author")
    emailAddress: String! @quin(enforce: email)
    friends: [Person] @quin(onDelete: cascade)
    status: String
  }

  type Book
    @quin(indexes: [{ name: "uix_book", type: unique, on: ["name", "author"] }])
  {
    # id: ID!
    name: String! @quin(transform: titleCase, deny: "The Bible")
    price: Float! @quin(range: [0, 100])
    author: Person! @quin(enforce: immutable, onDelete: cascade)
    bestSeller: Boolean
    bids: [Int]
    chapters: [Chapter] @quin(materializeBy: "book")
  }

  type Chapter
    @quin(indexes: [{name: "uix_chapter", type: unique, on: ["name", "book"]}])
  {
    # id: ID!
    name: String! @quin(transform: titleCase)
    book: Book! @quin(onDelete: restrict)
    pages: [Page] @quin(materializeBy: "chapter")
  }

  type Page
    @quin(indexes: [{name: "uix_page", type: unique, on: ["number", "chapter"]}])
  {
    # id: ID!
    number: Int!
    verbage: String
    chapter: Chapter!
  }

  type BookStore {
    # id: ID!
    name: String! @quin(transform: titleCase)
    location: String
    books: [Book] @quin(onDelete: cascade)
    building: Building! @quin(embedded: true, onDelete: cascade)
  }

  type Library {
    # id: ID!
    name: String! @quin(transform: titleCase)
    location: String,
    books: [Book] @quin(onDelete: cascade)
    building: Building! @quin(embedded: true, onDelete: cascade)
  }

  type Apartment {
    # id: ID!
    name: String! @quin(transform: titleCase)
    location: String
    building: Building! @quin(embedded: true, onDelete: cascade)
  }

  type Building
    @quin(hidden: true)
  {
    # id: ID!
    year: Int
    type: String! @quin(allow: ["home", "office", "business"])
    tenants: [Person] @quin(enforce: distinct, onDelete: cascade)
    landlord: Person @quin(onDelete: nullify)
  }

  type Color {
    # id: ID!
    type: String! @quin(allow: ["blue", "red", "green", "purple"])
    isDefault: Boolean @quin(norepeat: true)
  }

  type Art {
    # id: ID!
    name: String! @quin(transform: titleCase)
    bids: [Float]
  }
`;
