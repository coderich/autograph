module.exports = {
  typeDefs: `
    type Person
      @quin(indexes: [{ name: "uix_person_name", type: unique, on: ["name"] }])
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      authored: [Book] @quin(materializeBy: "author")
      emailAddress: String! @quin(enforce: email)
      friends: [Person] @quin(transform: dedupe, enforce: selfless, onDelete: cascade)
      status: String
    }

    type Book
      @quin(indexes: [{ name: "uix_book", type: unique, on: ["name", "author"] }])
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase, enforce: bookName)
      price: Float! @quin(enforce: bookPrice)
      author: Person! @quin(enforce: immutable, onDelete: cascade)
      bestSeller: Boolean
      bids: [Float]
      chapters: [Chapter] @quin(materializeBy: "book")
    }

    type Chapter
      @quin(indexes: [{ name: "uix_chapter", type: unique, on: ["name", "book"] }])
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      book: Book! @quin(onDelete: restrict)
      pages: [Page] @quin(materializeBy: "chapter")
    }

    type Page
      @quin(indexes: [{ name: "uix_page", type: unique, on: ["number", "chapter"] }])
    {
      # id: ID!
      number: Int!
      verbage: String
      chapter: Chapter!
    }

    type BookStore
      @quin(indexes: [{ name: "uix_bookstore", type: unique, on: ["name"] }]),
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      location: String
      books: [Book] @quin(onDelete: cascade)
      building: Building! @quin(onDelete: cascade)
    }

    type Library
      @quin(indexes: [
        { name: "uix_library", type: unique, on: ["name"] },
        { name: "uix_library_bulding", type: unique, on: ["building"] },
      ])
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      location: String,
      books: [Book] @quin(onDelete: cascade)
      building: Building! @quin(onDelete: cascade)
    }

    type Apartment
      @quin(indexes: [
        { name: "uix_apartment", type: unique, on: ["name"] },
        { name: "uix_apartment_bulding", type: unique, on: ["building"] },
      ])
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      location: String
      building: Building! @quin(onDelete: cascade)
    }

    type Building {
      # id: ID!
      year: Int
      type: String! @quin(enforce: buildingType)
      tenants: [Person] @quin(enforce: distinct, onDelete: cascade)
      landlord: Person @quin(onDelete: nullify)
    }

    type Color
      @quin
    {
      # id: ID!
      type: String! @quin(enforce: colors)
      isDefault: Boolean @quin(norepeat: true)
    }

    type Art
      @quin
    {
      # id: ID!
      name: String! @quin(transform: toTitleCase)
      bids: [Float]
      comments: [String] @quin(enforce: artComment)
    }
  `,
};
