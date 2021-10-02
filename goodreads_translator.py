import requests
import xmltodict
import json
from decouple import config

GOODREADS_ID = config('GOODREADS_ID')
GOODREADS_KEY = config('GOODREADS_KEY')


def run():
    response_as_xml = fetch_bookshelf()
    response_as_json = xml_to_json(response_as_xml)
    my_books = flatten_to_books(response_as_json)
    write(my_books)


def fetch_bookshelf():

    url = f'https://www.goodreads.com/review/list?v=2&key={GOODREADS_KEY}&id={GOODREADS_ID}&per_page=199&page=1'
    response = requests.get(url)
    xml_response = response.text
    return xml_response


def xml_to_json(xml):
    data_dict = xmltodict.parse(xml)
    return data_dict


def flatten_to_books(gr_response):
    gr_books = books(gr_response)
    return simplify(gr_books)


def books(gr_response):
    return gr_response['GoodreadsResponse']['reviews']['review']


def simplify(gr_books):
    result = list()
    for b in gr_books:
        authors = list()
        if len(b['book']['authors']) > 1:
            print(b['book']['authors'])
        for key, a in b['book']['authors'].items():
            authors.append(a['name'])
        b_isbn13 = b['book']['isbn13']
        if not type(b_isbn13) == str:
            b_isbn13 = ''
        parsed_book = {
            'title': b['book']['title'],
            'short_title': b['book']['title_without_series'],
            'authors': ' & '.join(authors),
            'isbn13': b_isbn13,
            'link': b['book']['link'],
            'num_pages': b['book']['num_pages'],
            'dateStarted': b['started_at'],
            'dateFinished': b['read_at'],
            'rating': b['rating'],
            'shelf': b['shelves']['shelf']['@name'],
            'goodreads_review_id': b['id'],
        }
        parsed_book = add_on_page(parsed_book)
        result.append(parsed_book)
    return result


def add_on_page(book):
    if book['shelf'] == 'read':
        book['on_page'] = book['num_pages']
    elif book['shelf'] == 'to-read':
        book['on_page'] = 0
    else:
        book['on_page'] = get_on_page_from_gr(book['goodreads_review_id'])
    return book


def get_on_page_from_gr(review_id):
    try:
        response_as_xml = fetch_review(review_id)
        response_as_json = xml_to_json(response_as_xml)
        on_page = parse_current_on_page(response_as_json)
        return on_page
    except Exception as e:
        print(f"Error get_on_page_from_gr: {e}")
        return 0


def fetch_review(review_id):
    url = f'https://www.goodreads.com/review/show?v=2&key={GOODREADS_KEY}&id={review_id}&per_page=199&page=1'
    response = requests.get(url)
    xml_response = response.text
    return xml_response


def parse_current_on_page(review_json):
    on_page = 0
    user_review = review_json['GoodreadsResponse']['review']
    if "user_statuses" not in user_review:
        return on_page
    user_statuses = user_review['user_statuses']['user_status']
    # Multiple user status updates
    if type(user_statuses) == list:
        for s in user_statuses:
            try:
                on_page = parse_page_int_from_status(s, on_page)
            except Exception:
                continue
    # Only 1 user status update
    else:
        try:
            on_page = parse_page_int_from_status(user_statuses, on_page)
        except Exception:
            pass
    return on_page


def parse_page_int_from_status(status, curr_on_page):
    has_page = 'page' in status and '@type' in status['page'] and '#text' in status['page'] and status['page']['@type'] == 'integer'
    if has_page:
        i_page = int(status['page']['#text'])
        if i_page > curr_on_page:
            curr_on_page = i_page
    return curr_on_page


def write(my_books):
    with open("translated_books_from_gr.json", "w") as json_file:
        json_file.write(json.dumps(my_books))


if __name__ == "__main__":
    run()
