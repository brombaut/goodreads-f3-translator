import fs from 'fs'
import { Book, F3Bookshelf, FirestoreBook, Shelf } from '@brombaut/types';
import { firebaseConfig } from './firebase.config';
import { FirestoreDateTranslator } from "firebase-firestore-facade";


main();

interface GRBook {
  title: string,
  short_title: string,
  authors:string,
  isbn13: string,
  link: string,
  num_pages: number | null,
  dateStarted: string | null,
  dateFinished: string | null,
  rating: string,
  shelf: Shelf,
  goodreads_review_id: string,
  on_page: number | null
}

async function main() {
  const f3: F3Bookshelf = await new F3Bookshelf(firebaseConfig).init();
  const booksFromGoodreads: GRBook[] = readTranslatedBooksFile();
  const f3Books: Book[] = await fetchF3Books(f3);
  const existingF3Books = syncExistingF3Books(f3Books, booksFromGoodreads);
  await updateF3WithSyncedBooks(f3, existingF3Books);
  const newF3Books = createNewF3Books(f3Books, booksFromGoodreads)
  await addNewBooksToF3(f3, newF3Books);
  await f3.closeConnection();
}

function readTranslatedBooksFile() {
  const data = fs.readFileSync('translated_books_from_gr.json', 'utf8');
  return JSON.parse(data);
}

async function fetchF3Books(f3: F3Bookshelf): Promise<Book[]> {
  const books: Book[] = await f3.get()
  return books;
}

function syncExistingF3Books(f3Books: Book[], grBooks: GRBook[]): Book[] {
  const result: Book[] = [];
  f3Books.forEach((b: Book) => {
    const grBook: GRBook | undefined = grBooks.find((grb: GRBook) => grb.goodreads_review_id === b.goodreads_review_id);
    if (!grBook) return;
    let needsSyncing = false;

    if (grBook.shelf == Shelf.CURRENTLYREADING && b.shelf == Shelf.TOREAD) {
      b.startReading();
      needsSyncing = true;
    }
    if (grBook.shelf == Shelf.READ && b.shelf == Shelf.CURRENTLYREADING) {
      b.finishedReading();
      needsSyncing = true;
    }

    if (b.onPage !== null && grBook.on_page !== null) {
      const changedAndGROnPageIsHigher = b.onPage !== grBook.on_page && grBook.on_page > b.onPage;
      if (changedAndGROnPageIsHigher) {
        b.onPage = grBook.on_page
        needsSyncing = true;
      }
    }
    if (b.rating !== parseInt(grBook.rating)) {
      b.rating = parseInt(grBook.rating)
      needsSyncing = true;
    }

    const grIsbnIsDifferentThanF3 = grBook.isbn13 && b.isbn13 !== grBook.isbn13;
    if (grIsbnIsDifferentThanF3) {
      console.warn(`WARNING - ReviewID=${b.goodreads_review_id} title=${b.title} :: ISBN13 do not match :: f3.isbn13=${b.isbn13} gr.isbn13=${grBook.isbn13}`)
    }
    if (needsSyncing) {
      result.push(b);
    }
  })
  return result;
}

async function updateF3WithSyncedBooks(f3: F3Bookshelf, syncedF3Books: Book[]) {
  for (const b of syncedF3Books) {
    await f3.put(b);
  }
}

function createNewF3Books(f3Books: Book[], grBooks: GRBook[]): FirestoreBook[] {
  const newGRBooks: GRBook[] = [];
  grBooks.forEach((grb: GRBook) => {
    const i = f3Books.findIndex((b: Book) => b.goodreads_review_id === grb.goodreads_review_id);
    if (i < 0) {
      newGRBooks.push(grb);
    }
  })

  const newFirestoreBooks: FirestoreBook[] = newGRBooks.map((grb: GRBook) => {
    let sDate = null;
    if (grb.dateStarted) {
      sDate = new FirestoreDateTranslator().fromDate(new Date(grb.dateStarted)).toFirestoreDate();
    }
    let fDate = null;
    if (grb.dateFinished) {
      fDate = new FirestoreDateTranslator().fromDate(new Date(grb.dateFinished)).toFirestoreDate();
    }
    return {
      id: '',
      goodreads_review_id: grb.goodreads_review_id,
      isbn13: grb.isbn13,
      title: grb.title,
      shortTitle: grb.short_title,
      authors: [grb.authors],
      numPages: grb.num_pages || 0,
      link: grb.link,
      shelf: grb.shelf,
      onPage: grb.on_page,
      dateStarted: sDate,
      dateFinished: fDate,
      rating: parseInt(grb.rating),
    }
  })
  return newFirestoreBooks;
}

async function addNewBooksToF3(f3: F3Bookshelf, newBooks: FirestoreBook[]) {
  for (const fb of newBooks) {
    await f3.post(fb);
  }
}


