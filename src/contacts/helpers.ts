import { Contact, User } from '../interfaces';
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

let pendingRequests: AbortController[] = [];

export const fetchContactHistory = (
  reset: boolean,
  endpoint: string,
  ticket: string,
  before: number = undefined,
  after: number = undefined
): Promise<ContactHistoryPage> => {
  if (reset) {
    pendingRequests.forEach(controller => {
      controller.abort();
    });
    pendingRequests = [];
  }

  return new Promise<ContactHistoryPage>(resolve => {
    const controller = new AbortController();
    pendingRequests.push(controller);

    let url = endpoint;
    if (before) {
      url += `&before=${before}`;
    }

    if (after) {
      url += `&after=${after}`;
    }

    if (ticket) {
      url += `&ticket=${ticket}`;
    }

    getUrl(url, controller)
      .then((response: WebResponse) => {
        // on success, remove our abort controller
        pendingRequests = pendingRequests.filter(
          (controller: AbortController) => {
            return response.controller === controller;
          }
        );
        resolve(response.json as ContactHistoryPage);
      })
      .catch(() => {
        // canceled
      });
  });
};

export const getDisplayName = (user: User) => {
  if (!user) {
    return 'Somebody';
  }

  if (user.first_name && user.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }

  if (user.first_name) {
    return user.first_name;
  }

  return user.email;
};
