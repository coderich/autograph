const Rule = require('../../src/core/Rule');

Rule.extend('bookName', Rule.deny('The Bible'));
Rule.extend('bookPrice', Rule.range(0, 100));
Rule.extend('artComment', Rule.allow('yay', 'great', 'boo'));
Rule.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
Rule.extend('buildingType', Rule.allow('home', 'office', 'business'));

module.exports = {
  typeDefs: `
    input PersonInputMeta {
      notify: Boolean
    }

    type Person
      @model(meta: "PersonInputMeta")
      @index(name: "uix_person_name", type: unique, on: ["name"])
    {
      name: String! @field(transform: toTitleCase)
      authored: [Book] @field(materializeBy: "author")
      emailAddress: String! @field(alias: "email_address", enforce: email)
      friends: [Person] @field(transform: dedupe, enforce: selfless, onDelete: cascade)
      status: String @field(alias: "state")
      telephone: String
      # network: String @value(scope: segment, path: "network.id")
    }

    type Book
      @model
      @index(name: "uix_book", type: unique, on: ["name", "author"])
    {
      name: String! @field(transform: toTitleCase, enforce: bookName)
      price: Float! @field(enforce: bookPrice)
      author: Person! @field(enforce: immutable, onDelete: cascade)
      bestSeller: Boolean
      bids: [Float]
      chapters: [Chapter] @field(materializeBy: "book")
    }

    type Chapter
      @model
      @index(name: "uix_chapter", type: unique, on: ["name", "book"])
    {
      name: String! @field(alias: "chapter_name" transform: toTitleCase)
      book: Book! @field(onDelete: restrict)
      pages: [Page] @field(materializeBy: "chapter")
    }

    type Page
      @model
      @index(name: "uix_page", type: unique, on: ["number", "chapter"])
    {
      number: Int!
      verbage: String
      chapter: Chapter!
    }

    type BookStore
      @model
      @index(name: "uix_bookstore", type: unique, on: ["name"])
    {
      name: String! @field(transform: toTitleCase)
      location: String
      books: [Book] @field(onDelete: cascade)
      building: Building! @field(onDelete: cascade)
    }

    type Library
      @model
      @index(name: "uix_library", type: unique, on: ["name"])
      @index(name: "uix_library_bulding", type: unique, on: ["building"])
    {
      name: String! @field(transform: toTitleCase)
      location: String,
      books: [Book] @field(onDelete: cascade)
      building: Building! @field(onDelete: cascade)
    }

    type Apartment
      @model
      @index(name: "uix_apartment", type: unique, on: ["name"])
      @index(name: "uix_apartment_bulding", type: unique, on: ["building"])
    {
      name: String! @field(transform: toTitleCase)
      location: String
      building: Building! @field(onDelete: cascade)
    }

    type Building
    {
      year: Int
      type: String! @field(enforce: buildingType)
      tenants: [Person] @field(enforce: distinct, onDelete: cascade)
      landlord: Person @field(onDelete: nullify)
    }

    type Color
      @model
    {
      type: String! @field(enforce: colors)
      isDefault: Boolean @field(noRepeat: true)
    }

    type Art
      @model
    {
      name: String! @field(transform: toTitleCase)
      bids: [Float]
      comments: [String] @field(enforce: artComment)
    }

    type PlainJane {
      id: ID!
      name: String
    }
  `,
};
