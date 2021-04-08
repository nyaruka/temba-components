import { Contact, Msg, ObjectReference } from '../interfaces';
import { fetchResults, getUrl, postUrl, WebResponse } from '../utils';
import { ContactHistoryPage } from './events';

export const SCROLL_THRESHOLD = 100;
export const SIMULATED_WEB_SLOWNESS = 0;
export const MAX_CHAT_REFRESH = 10000;
export const MIN_CHAT_REFRESH = 500;
export const BODY_SNIPPET_LENGTH = 250;

export const closeTicket = (uuid: string): Promise<WebResponse> => {
  const formData = new FormData();
  formData.append('status', 'C');
  return postUrl(`/ticket/update/${uuid}/?_format=json`, formData);
};

export const fetchContact = (endpoint: string): Promise<Contact> => {
  return new Promise<Contact>((resolve, reject) => {
    fetchResults(endpoint).then((contacts: Contact[]) => {
      if (contacts && contacts.length === 1) {
        resolve(contacts[0]);
      } else {
        reject('No contact found');
      }
    });
  });
};

// let pendingRequests: CancelTokenSource[] = [];

export const fetchContactHistory = (
  reset: boolean,
  endpoint: string,
  before: number = undefined,
  after: number = undefined,
  limit: number = undefined
): Promise<ContactHistoryPage> => {
  if (reset) {
    /* pendingRequests.forEach(token => {
      token.cancel();
    });
    pendingRequests = [];*/
  }

  return new Promise<ContactHistoryPage>((resolve, reject) => {
    // const CancelToken = axios.CancelToken;
    // const cancelToken = CancelToken.source();
    // pendingRequests.push(cancelToken);

    let url = endpoint;
    if (before) {
      url += `&before=${before}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

    getUrl(url)
      .then((response: WebResponse) => {
        // pendingRequests = pendingRequests.filter((token: CancelTokenSource) => {
        // token.token !== response.config.cancelToken;
        // });

        resolve(response.json as ContactHistoryPage);
      })
      .catch(error => {
        // canceled
      });
  });
};
