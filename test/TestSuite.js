// const Neo4j = require('neodb');
// const Redis = require('redis-mock');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { timeout } = require('../src/service/app.service');
const Schema = require('../src/core/Schema');
const DataLoader = require('../src/core/DataLoader');
const { schema, stores } = require('./schema');

let loader;
let richard;
let christie;
let mobyDick;
let healthBook;
let chapter1;
let chapter2;
let page1;
let page2;
let page3;
let page4;
let bookBuilding;
let libraryBuilding;
let apartmentBuilding;
let bookstore1;
let bookstore2;
let library;

const sorter = (a, b) => {
  const idA = `${a.id}`;
  const idB = `${b.id}`;
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
};

module.exports = (name, db = 'mongo') => {
  describe(`${name}-${db}`, () => {
    beforeAll(async () => {
      jest.setTimeout(60000);

      const driverArgs = {};

      // Start in-memory db
      switch (db) {
        case 'redis': {
          // const redisClient = Redis.createClient();
          stores.default.type = 'redis';
          // driverArgs.redis = redisClient;
          break;
        }
        case 'neo4j': {
          stores.default.type = 'neo4jDriver';
          stores.default.uri = 'bolt://localhost';
          break;
        }
        case 'neo4jRest': {
          stores.default.type = 'neo4jRest';
          stores.default.uri = 'http://localhost:7474';
          break;
        }
        default: {
          const mongoServer = new MongoMemoryServer();
          stores.default.uri = await mongoServer.getConnectionString();
          break;
        }
      }

      // Create core classes
      const schema2 = new Schema(schema, stores, driverArgs);
      loader = new DataLoader(schema2);

      //
      await timeout(2000);
      await Promise.all(schema2.getModels().map(model => model.drop()));
      await timeout(500);
    });


    describe('Create', () => {
      test('Person', async () => {
        richard = await loader.match('Person').save({ name: 'Richard', emailAddress: 'rich@coderich.com' });
        expect(richard.id).toBeDefined();
        expect(richard.name).toBe('Richard');

        christie = await loader.match('Person').save({ name: 'Christie', emailAddress: 'christie@gmail.com', friends: [richard.id] });
        expect(christie.id).toBeDefined();
        expect(christie.friends).toEqual([richard.id]);
      });

      test('Book', async () => {
        mobyDick = await loader.match('Book').save({ name: 'moby dick', price: 9.99, bids: [1.99, 1.20, 5.00], bestSeller: true, author: richard.id });
        expect(mobyDick.id).toBeDefined();
        expect(mobyDick.name).toBe('Moby Dick');
        expect(mobyDick.price).toBe(9.99);
        expect(mobyDick.author).toBe(richard.id);

        healthBook = await loader.match('Book').save({ name: 'Health and Wellness', bids: [5.00, 9.00, 12.50], price: '29.99', author: christie.id });
        expect(healthBook.id).toBeDefined();
        expect(healthBook.name).toEqual('Health And Wellness');
        expect(healthBook.price).toEqual(29.99);
        expect(healthBook.author).toEqual(christie.id);
      });

      test('Chapter', async () => {
        chapter1 = await loader.match('Chapter').save({ name: 'chapter1', book: healthBook.id });
        chapter2 = await loader.match('Chapter').save({ name: 'chapter2', book: healthBook.id });
        expect(chapter1.id).toBeDefined();
        expect(chapter1.name).toEqual('Chapter1');
        expect(chapter2.id).toBeDefined();
        expect(chapter2.name).toEqual('Chapter2');
      });

      test('Page', async () => {
        page1 = await loader.match('Page').save({ number: 1, chapter: chapter1.id, verbage: 'This is the introduction, of sorts.' });
        page2 = await loader.match('Page').save({ number: 2, chapter: chapter1.id, verbage: 'Now you know.' });
        page3 = await loader.match('Page').save({ number: 1, chapter: chapter2.id, verbage: 'Ready for more?' });
        page4 = await loader.match('Page').save({ number: 2, chapter: chapter2.id, verbage: 'The end.' });
        await loader.match('Page').save({ number: 3, chapter: chapter2.id, verbage: 'The real end.' });
        expect(page1.id).toBeDefined();
        expect(page2.id).toBeDefined();
        expect(page3.id).toBeDefined();
        expect(page4.id).toBeDefined();
      });

      test('Building', async () => {
        bookBuilding = await loader.match('Building').save({ year: 1990, type: 'business', tenants: christie.id });
        libraryBuilding = await loader.match('Building').save({ type: 'business', tenants: christie.id });
        apartmentBuilding = await loader.match('Building').save({ type: 'home', tenants: [richard.id, christie.id], landlord: richard.id });
        expect(bookBuilding.id).toBeDefined();
        expect(bookBuilding.year).toEqual(1990);
        expect(libraryBuilding.id).toBeDefined();
        expect(libraryBuilding.tenants).toEqual([christie.id]);
        expect(apartmentBuilding.id).toBeDefined();
        expect(apartmentBuilding.landlord).toEqual(richard.id);
        expect(apartmentBuilding.tenants).toEqual([richard.id, christie.id]);
      });

      test('BookStore', async () => {
        bookstore1 = await loader.match('BookStore').save({ name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: bookBuilding });
        bookstore2 = await loader.match('BookStore').save({ name: 'New Books', books: [mobyDick.id], building: bookBuilding });
        expect(bookstore1.id).toBeDefined();
        expect(bookstore1.books.length).toEqual(3);
        expect(bookstore1.building.type).toEqual('business');
        expect(bookstore2.id).toBeDefined();
        expect(bookstore2.books.length).toEqual(1);
        expect(bookstore2.building.type).toEqual('business');
      });

      test('Library', async () => {
        library = await loader.match('Library').save({ name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: libraryBuilding });
        expect(library.id).toBeDefined();
        expect(library.books.length).toEqual(3);
        expect(library.building.type).toEqual('business');
      });
    });


    describe('Get', () => {
      test('Person', async () => {
        expect(await loader.match('Person').id(richard.id).one()).toMatchObject({ id: richard.id, name: richard.name });
        expect(await loader.match('Person').id(christie.id).one()).toMatchObject({ id: christie.id, name: christie.name, friends: [richard.id] });
      });

      test('Book', async () => {
        expect(await loader.match('Book').id(mobyDick.id).one()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick', author: richard.id });
        expect(await loader.match('Book').id(healthBook.id).one()).toMatchObject({ id: healthBook.id, name: 'Health And Wellness', author: christie.id });
      });

      test('Chapter', async () => {
        expect(await loader.match('Chapter').id(chapter1.id).one()).toMatchObject({ id: chapter1.id, name: 'Chapter1', book: healthBook.id });
        expect(await loader.match('Chapter').id(chapter2.id).one()).toMatchObject({ id: chapter2.id, name: 'Chapter2', book: healthBook.id });
      });

      test('Page', async () => {
        expect(await loader.match('Page').id(page1.id).one()).toMatchObject({ id: page1.id, number: 1, chapter: chapter1.id });
        expect(await loader.match('Page').id(page2.id).one()).toMatchObject({ id: page2.id, number: 2, chapter: chapter1.id });
        expect(await loader.match('Page').id(page3.id).one()).toMatchObject({ id: page3.id, number: 1, chapter: chapter2.id });
        expect(await loader.match('Page').id(page4.id).one()).toMatchObject({ id: page4.id, number: 2, chapter: chapter2.id });
      });

      test('Building', async () => {
        expect(await loader.match('Building').id(bookBuilding.id).one()).toMatchObject({ id: bookBuilding.id, year: 1990, type: 'business' });
        expect(await loader.match('Building').id(libraryBuilding.id).one()).toMatchObject({ id: libraryBuilding.id, type: 'business' });
        expect(await loader.match('Building').id(apartmentBuilding.id).one()).toMatchObject({ id: apartmentBuilding.id, type: 'home', tenants: [richard.id, christie.id], landlord: richard.id });
      });

      test('BookStore', async () => {
        expect(await loader.match('BookStore').id(bookstore1.id).one()).toMatchObject({ id: bookstore1.id, name: 'Best Books Ever', books: [mobyDick.id, mobyDick.id, healthBook.id], building: expect.objectContaining(bookBuilding) });
        expect(await loader.match('BookStore').id(bookstore2.id).one()).toMatchObject({ id: bookstore2.id, name: 'New Books', books: [mobyDick.id], building: expect.objectContaining(bookBuilding) });
      });

      test('Library', async () => {
        expect(await loader.match('Library').id(library.id).one()).toMatchObject({ id: library.id, name: 'Public Library', books: [mobyDick.id, healthBook.id, healthBook.id], building: expect.objectContaining(libraryBuilding) });
      });

      test('Null', async () => {
        expect(await loader.match('Library').id('no-such-id').one()).toBeNull();
      });
    });


    describe('Find', () => {
      test('Person', async () => {
        expect((await loader.match('Person').many({ find: true })).length).toBe(2);
        expect(await loader.match('Person').where({ name: 'richard' }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ name: 'Christie' }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ emailAddress: 'rich@coderich.com' }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect((await loader.match('Person').where({ name: ['Richard', 'Christie'] }).many({ find: true })).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect((await loader.match('Person').where({ name: '*' }).many({ find: true })).sort(sorter)).toMatchObject([{ id: christie.id, name: 'Christie' }, { id: richard.id, name: 'Richard' }].sort(sorter));
        expect(await loader.match('Person').where({ authored: mobyDick.id }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
      });

      test('Book', async () => {
        expect((await loader.match('Book').many({ find: true })).length).toBe(2);
        expect(await loader.match('Book').where({ author: richard.id }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ price: 9.99 }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ price: '9.99' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ author: christie.id }).many({ find: true })).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await loader.match('Book').where({ bestSeller: true }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ bestSeller: 'TRu?' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ bestSeller: 'tru' }).many({ find: true })).toMatchObject([]);
        expect(await loader.match('Book').where({ price: '?.??' }).many({ find: true })).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick', author: richard.id }]);
        expect(await loader.match('Book').where({ price: '??.*' }).many({ find: true })).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness', author: christie.id }]);
        expect(await loader.match('Book').where({ bids: [1.99] }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ bids: 1.99 }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect((await loader.match('Book').where({ bids: 5.00 }).many({ find: true })).sort(sorter)).toMatchObject([{ id: mobyDick.id }, { id: healthBook.id }].sort(sorter));
        expect(await loader.match('Book').where({ bids: [19.99, '1.99'] }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ chapters: chapter1.id }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
      });

      test('Chapter', async () => {
        expect((await loader.match('Chapter').many({ find: true })).length).toBe(2);
        expect(await loader.match('Chapter').where({ name: 'cHAPter1' }).many({ find: true })).toMatchObject([{ id: chapter1.id, name: 'Chapter1', book: healthBook.id }]);
        expect(await loader.match('Chapter').where({ name: 'cHAPteR2' }).many({ find: true })).toMatchObject([{ id: chapter2.id, name: 'Chapter2', book: healthBook.id }]);
        expect(await loader.match('Chapter').where({ name: 'cHAPteR3' }).many({ find: true })).toEqual([]);
        expect(await loader.match('Chapter').where({ book: mobyDick.id }).many({ find: true })).toEqual([]);
        expect(await loader.match('Chapter').where({ book: 'some-odd-id' }).many({ find: true })).toEqual([]);
        expect((await loader.match('Chapter').where({ book: healthBook.id }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: chapter1.id, name: 'Chapter1', book: healthBook.id },
          { id: chapter2.id, name: 'Chapter2', book: healthBook.id },
        ].sort(sorter));
      });

      test('Page', async () => {
        expect((await loader.match('Page').many({ find: true })).length).toBe(5);
        expect((await loader.match('Page').where({ chapter: chapter1.id }).many({ find: true })).length).toBe(2);
        expect((await loader.match('Page').where({ chapter: chapter2.id }).many({ find: true })).length).toBe(3);
        expect((await loader.match('Page').where({ number: 1 }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: page1.id, chapter: chapter1.id },
          { id: page3.id, chapter: chapter2.id },
        ].sort(sorter));
        expect((await loader.match('Page').where({ number: '2' }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: page2.id, chapter: chapter1.id },
          { id: page4.id, chapter: chapter2.id },
        ].sort(sorter));
      });

      test('Building', async () => {
        expect((await loader.match('Building').many({ find: true })).length).toBe(3);
        expect((await loader.match('Building').where({ tenants: [richard.id] }).many({ find: true })).length).toBe(1);
        expect((await loader.match('Building').where({ tenants: [christie.id] }).many({ find: true })).length).toBe(3);
        expect((await loader.match('Building').where({ tenants: [richard.id, christie.id] }).many({ find: true })).length).toBe(3);
        expect((await loader.match('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).many({ find: true })).length).toBe(1);
        expect((await loader.match('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).many({ find: true })).length).toBe(0);
      });

      test('BookStore', async () => {
        expect((await loader.match('BookStore').many({ find: true })).length).toBe(2);
        expect((await loader.match('BookStore').where({ books: [mobyDick.id] }).many({ find: true })).length).toBe(2);
        expect((await loader.match('BookStore').where({ name: 'new books' }).many({ find: true })).sort(sorter)).toMatchObject([
          { id: bookstore2.id, name: 'New Books', building: expect.objectContaining(bookBuilding) },
        ].sort(sorter));
      });

      test('Library', async () => {
        expect((await loader.match('Library').many({ find: true })).length).toBe(1);
      });
    });


    describe('Count (find)', () => {
      test('Person', async () => {
        expect(await loader.match('Person').count()).toBe(2);
        expect(await loader.match('Person').where({ name: 'richard' }).count()).toBe(1);
        expect(await loader.match('Person').where({ name: 'Christie' }).count()).toBe(1);
      });

      test('Book', async () => {
        expect(await loader.match('Book').count()).toBe(2);
        expect(await loader.match('Book').where({ author: richard.id }).count()).toBe(1);
        expect(await loader.match('Book').where({ price: 9.99 }).count()).toBe(1);
        expect(await loader.match('Book').where({ price: '9.99' }).count()).toBe(1);
        expect(await loader.match('Book').where({ author: christie.id }).count()).toBe(1);
      });

      test('Chapter', async () => {
        expect(await loader.match('Chapter').count()).toBe(2);
        expect(await loader.match('Chapter').where({ name: 'cHAPter1' }).count()).toBe(1);
        expect(await loader.match('Chapter').where({ name: 'cHAPteR2' }).count()).toBe(1);
        expect(await loader.match('Chapter').where({ name: 'cHAPteR3' }).count()).toBe(0);
        expect(await loader.match('Chapter').where({ book: mobyDick.id }).count()).toBe(0);
        expect(await loader.match('Chapter').where({ book: 'some-odd-id' }).count()).toEqual(0);
        expect(await loader.match('Chapter').where({ book: healthBook.id }).count()).toBe(2);
      });

      test('Page', async () => {
        expect(await loader.match('Page').count()).toBe(5);
        expect(await loader.match('Page').where({ chapter: chapter1.id }).count()).toBe(2);
        expect(await loader.match('Page').where({ chapter: chapter2.id }).count()).toBe(3);
        expect(await loader.match('Page').where({ number: 1 }).count()).toBe(2);
        expect(await loader.match('Page').where({ number: '2' }).count()).toBe(2);
      });

      test('Building', async () => {
        expect(await loader.match('Building').count()).toBe(3);
        expect(await loader.match('Building').where({ tenants: [richard.id] }).count()).toBe(1);
        expect(await loader.match('Building').where({ tenants: [christie.id] }).count()).toBe(3);
        expect(await loader.match('Building').where({ tenants: [richard.id, christie.id] }).count()).toBe(3);
        expect(await loader.match('Building').where({ tenants: [richard.id, christie.id], landlord: richard.id }).count()).toBe(1);
        expect(await loader.match('Building').where({ tenants: [richard.id, christie.id], landlord: christie.id }).count()).toBe(0);
      });

      test('BookStore', async () => {
        expect(await loader.match('BookStore').count()).toBe(2);
        expect(await loader.match('BookStore').where({ books: [mobyDick.id] }).count()).toBe(2);
        expect(await loader.match('BookStore').where({ name: 'new books' }).count()).toBe(1);
      });

      test('Library', async () => {
        expect(await loader.match('Library').count()).toBe(1);
      });
    });


    describe('Data Validation', () => {
      test('Person', async () => {
        await expect(loader.match('Person').save()).rejects.toThrow();
        await expect(loader.match('Person').save({ name: 'Richard' })).rejects.toThrow();
        await expect(loader.match('Person').save({ name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: ['nobody'] })).rejects.toThrow();
        await expect(loader.match('Person').save({ name: 'NewGuy', emailAddress: 'newguy@gmail.com', friends: [richard.id, 'nobody'] })).rejects.toThrow();
        await expect(loader.match('Person').save({ name: 'NewGuy', emailAddress: 'newguygmail.com' })).rejects.toThrow();
        await expect(loader.match('Person').id(richard.id).save({ name: 'Christie' })).rejects.toThrow();
        await expect(loader.match('Person').id(richard.id).save({ name: 'christie' })).rejects.toThrow();
        await expect(loader.match('Person').id(richard.id).save({ name: null })).rejects.toThrow();
        await expect(loader.match('Person').id('nobody').save({ name: 'NewGuy' })).rejects.toThrow();
        await expect(loader.match('Person').id(richard.id).save({ friends: [richard.id] })).rejects.toThrow();
      });

      test('Book', async () => {
        await expect(loader.match('Book').save()).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible' })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible', author: 'Moses' })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible', author: richard.id })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible', price: 1.99 })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible', price: 1.99, author: mobyDick.id })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'The Bible', price: 1.99, author: [christie.id] })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'the bible', price: 1.99, author: christie.id })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'Great Book', price: -1, author: christie.id })).rejects.toThrow();
        await expect(loader.match('Book').save({ name: 'Best Book', price: 101, author: christie.id })).rejects.toThrow();
        await expect(loader.match('Book').id(mobyDick.id).save({ author: christie.id })).rejects.toThrow();
        await expect(loader.match('Book').id(mobyDick.id).save({ author: richard.id })).resolves;

        switch (stores.default.type) {
          case 'mongo': {
            await expect(loader.match('Book', { name: 'MoBY DiCK', price: 1.99, author: richard.id }).save()).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Chapter', async () => {
        await expect(loader.match('Chapter').save()).rejects.toThrow();
        await expect(loader.match('Chapter').save({ name: 'chapter1' })).rejects.toThrow();
        await expect(loader.match('Chapter').save({ name: 'chapter2' })).rejects.toThrow();
        await expect(loader.match('Chapter').save({ name: 'chapter3' })).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(loader.match('Chapter').save({ name: 'chapter1', book: healthBook.id })).rejects.toThrow();
            await expect(loader.match('Chapter').save({ name: 'chapter3', book: christie.id })).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Page', async () => {
        await expect(loader.match('Page').save()).rejects.toThrow();
        await expect(loader.match('Page').save({ number: 3 })).rejects.toThrow();

        switch (stores.default.type) {
          case 'mongo': {
            await expect(loader.match('Page').save({ number: 1, chapter: chapter1 })).rejects.toThrow();
            await expect(loader.match('Page').save({ number: 1, chapter: chapter1.id })).rejects.toThrow();
            await expect(loader.match('Page').save({ number: 1, chapter: page4.id })).rejects.toThrow();
            await expect(loader.match('Page').id(page1.id).save({ number: 2 })).rejects.toThrow();
            break;
          }
          default: break;
        }
      });

      test('Building', async () => {
        await expect(loader.match('Building').save()).rejects.toThrow();
        await expect(loader.match('Building').save({ type: 'bad-type' })).rejects.toThrow();
        await expect(loader.match('Building').save({ type: 'business', landlord: bookstore1.id })).rejects.toThrow();
        await expect(loader.match('Building').save({ type: 'business', tenants: [richard.id, bookstore1.id] })).rejects.toThrow();
      });

      test('BookStore', async () => {
        await expect(loader.match('BookStore').save()).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'New Books' })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'New Books', building: 'bad-building' })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'besT bookS eveR', building: bookBuilding })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'Best Books Ever', building: libraryBuilding })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'More More Books', building: bookBuilding, books: bookBuilding.id })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'More More Books', building: bookBuilding, books: [bookBuilding.id] })).rejects.toThrow();
        await expect(loader.match('BookStore').save({ name: 'More More Books', building: bookBuilding, books: [mobyDick.id, bookBuilding] })).rejects.toThrow();
      });

      test('Library', async () => {
        await expect(loader.match('Library').save()).rejects.toThrow();
        await expect(loader.match('Library').save({ name: 'New Library' })).rejects.toThrow();
        await expect(loader.match('Library').save({ name: 'New Library', building: 'bad-building' })).rejects.toThrow();
        await expect(loader.match('Library').save({ name: 'New Library', building: libraryBuilding })).rejects.toThrow();
      });
    });


    describe('Data Normalization', () => {
      test('uniq', async () => {
        richard = await loader.match('Person').id(richard.id).save({ name: 'richard', friends: [christie.id, christie.id, christie.id] });
        expect(richard.name).toEqual('Richard');
        expect(richard.friends).toEqual([christie.id]);
      });
    });


    describe('Find (Deep)', () => {
      test('Person', async () => {
        expect(await loader.match('Person').where({ authored: { name: 'Moby Dick' } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ authored: { author: { name: 'ChRist??' } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ friends: { name: 'Christie' } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ friends: { authored: { name: 'Health*' } } }).many({ find: true })).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).many({ find: true })).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).many({ find: true })).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many({ find: true })).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await loader.match('Book').where({ author: { name: 'Richard' } }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ author: { authored: { name: 'Moby*' } } }).many({ find: true })).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ author: { authored: { name: 'Health*' } } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect((await loader.match('Book').where({ author: { authored: { name: '*' } } }).many({ find: true })).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await loader.match('Book').where({ chapters: { name: 'Chapter1' } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: '*' } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { pages: { number: 1 } } }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).many({ find: true })).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Update', () => {
      test('Person', async () => {
        expect(await loader.match('Person').id(richard.id).save({ name: 'Rich' })).toMatchObject({ id: richard.id, name: 'Rich' });
        expect(await loader.match('Person').id(richard.id).save({ name: 'richard' })).toMatchObject({ id: richard.id, name: 'Richard' });
      });

      test('Book', async () => {
        expect(await loader.match('Book').id(mobyDick.id).save({ name: 'mopey dick' })).toMatchObject({ id: mobyDick.id, name: 'Mopey Dick' });
        expect(await loader.match('Book').id(mobyDick.id).save({ name: 'moby dick' })).toMatchObject({ id: mobyDick.id, name: 'Moby Dick' });
      });
    });


    describe('Query (Deep)', () => {
      test('Person', async () => {
        expect(await loader.match('Person').where({ authored: { name: 'Moby Dick' } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ authored: { author: { name: 'ChRist??' } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ friends: { name: 'Christie' } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ friends: { authored: { name: 'Health*' } } }).many()).toMatchObject([{ id: richard.id, name: 'Richard' }]);
        expect(await loader.match('Person').where({ friends: { authored: { name: 'Cray Cray*' } } }).many()).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: 'city lust' } } } }).many()).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: 'the end.' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: 'chapter*', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
        expect(await loader.match('Person').where({ authored: { chapters: { name: '{citizen,chap*}', pages: { verbage: '*intro*' } } } }).many()).toMatchObject([{ id: christie.id, name: 'Christie' }]);
      });

      test('Book', async () => {
        expect(await loader.match('Book').where({ author: { name: 'Richard' } }).many()).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ author: { authored: { name: 'Moby*' } } }).many()).toMatchObject([{ id: mobyDick.id }]);
        expect(await loader.match('Book').where({ author: { authored: { name: 'Health*' } } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect((await loader.match('Book').where({ author: { authored: { name: '*' } } }).many()).sort(sorter)).toMatchObject([{ id: healthBook.id }, { id: mobyDick.id }].sort(sorter));
        expect(await loader.match('Book').where({ chapters: { name: 'Chapter1' } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: ['chapter1', 'chapter2'] } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: ['chapter1', 'no-chapter'] } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { name: '*' } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: { pages: { number: 1 } } }).many()).toMatchObject([{ id: healthBook.id }]);
        expect(await loader.match('Book').where({ chapters: [{ name: 'HongKong' }, chapter1.id] }).many()).toMatchObject([{ id: healthBook.id }]);
      });
    });


    describe('Query (by counts)', () => {
      test('Person', async () => {
        expect(await loader.match('Person').where({ countAuthored: '2' }).many()).toMatchObject([]);
        expect((await loader.match('Person').where({ countAuthored: '1' }).many()).length).toBe(2);
        expect((await loader.match('Person').where({ authored: { countChapters: '2' } }).many())).toMatchObject([{ id: christie.id }]);
        expect((await loader.match('Person').where({ authored: { countChapters: '0' } }).many())).toMatchObject([{ id: richard.id }]);
        expect((await loader.match('Person').where({ authored: { chapters: { countPages: '2' } } }).many())).toMatchObject([{ id: christie.id }]);
      });
    });


    describe('Query (sortBy sliced results)', () => {
      test('sortBy', async () => {
        expect(await loader.match('Book').sortBy({ name: 'asc' }).one()).toMatchObject({ id: healthBook.id, name: 'Health And Wellness' });
        expect(await loader.match('Book').sortBy({ name: 'desc' }).one()).toMatchObject({ id: mobyDick.id, name: 'Moby Dick' });
        expect(await loader.match('Book').sortBy({ name: 'desc' }).first(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await loader.match('Book').sortBy({ name: 'desc' }).last(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).first(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).last(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).first(2)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }, { id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).last(2)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }, { id: mobyDick.id, name: 'Moby Dick' }]);
      });
    });


    describe('Query (sortBy with Cursors)', () => {
      test('sortBy', async () => {
        const [health, moby] = await loader.match('Book').sortBy({ name: 'asc' }).many();
        const [healthCursor, mobyCursor] = [health.$$cursor, moby.$$cursor];
        expect(await loader.match('Book').sortBy({ name: 'asc' }).after(healthCursor).first(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).after(healthCursor).last(1)).toMatchObject([{ id: mobyDick.id, name: 'Moby Dick' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).before(healthCursor).first(1)).toMatchObject([]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).before(healthCursor).last(1)).toMatchObject([]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).after(mobyCursor).first(1)).toMatchObject([]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).after(mobyCursor).last(1)).toMatchObject([]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).before(mobyCursor).first(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
        expect(await loader.match('Book').sortBy({ name: 'asc' }).before(mobyCursor).last(1)).toMatchObject([{ id: healthBook.id, name: 'Health And Wellness' }]);
      });
    });


    describe('Query (sortBy deep)', () => {
      test('sortBy', async () => {
        expect(await loader.match('Person').sortBy({ authored: { chapters: { name: 'asc' } } }).many()).toMatchObject([{ id: christie.id }, { id: richard.id }]);
        expect(await loader.match('Person').sortBy({ authored: { chapters: { name: 'desc' } } }).many()).toMatchObject([{ id: richard.id }, { id: christie.id }]);
        expect(await loader.match('Person').sortBy({ authored: { chapters: { countPages: 'asc' } } }).many()).toMatchObject([{ id: richard.id }, { id: christie.id }]);
        expect(await loader.match('Person').sortBy({ authored: { chapters: { countPages: 'desc' } } }).many()).toMatchObject([{ id: christie.id }, { id: richard.id }]);
        expect(await loader.match('Chapter').sortBy({ countPages: 'asc', name: 'desc' }).many()).toMatchObject([{ name: 'Chapter1' }, { name: 'Chapter2' }]);
        expect(await loader.match('Chapter').sortBy({ countPages: 'desc', name: 'desc' }).many()).toMatchObject([{ name: 'Chapter2' }, { name: 'Chapter1' }]);
      });
    });


    describe('Remove', () => {
      test('remove', async () => {
        await expect(loader.match('Person').remove()).rejects.toThrow();
        expect(await loader.match('Person').id(richard.id).remove()).toMatchObject({ id: richard.id, name: 'Richard' });
      });
    });
  });
};
