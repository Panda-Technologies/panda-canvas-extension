// Because I can't import these from the Content module
const UNINSTALL_URL = 'https://www.tasksforcanvas.info/uninstall';
const INSTALL_URL = 'https://www.tasksforcanvas.info/getting-started';

chrome.runtime.onInstalled.addListener(function (object) {
  if (object.reason === 'install') {
    const now = new Date().getTime();
    chrome.tabs.create({ url: `${INSTALL_URL}?ref=install` });
    chrome.storage.sync.set({ install_time: now });
    chrome.runtime.setUninstallURL(`${UNINSTALL_URL}?b=${now}&c=133`);
  }
});

chrome.storage.onChanged.addListener(function (changes) {
  if ('client_id' in changes) {
    chrome.storage.sync.get(['client_id', 'install_time'], (result) => {
      if (!result['install_time']) result['install_time'] = '1693540800000';
      const params = new URLSearchParams({
        a: result['client_id'],
        b: result['install_time'],
        c: '133',
      });
      chrome.runtime.setUninstallURL(`${UNINSTALL_URL}?${params.toString()}`);
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MAKE_CLASS_REQUEST') {
    fetch('http://localhost:5001/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation ImportCanvasClasses($input: importCanvasClassesInput!) {
            importCanvasClasses(input: $input) {
              id
              classCode
              color
              sections {
                id
                section
                dayOfWeek
                startTime
                endTime
                professor
              }
            }
          }
        `,
        variables: {
          input: {
            courseInput: request.data.courseInput
          }
        }
      })
    })
      .then(response => response.json())
      .then(data => sendResponse(data))
      .catch(error => sendResponse({ errors: [{ message: error.message }] }));

    return true; // Will respond asynchronously
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'MAKE_TASK_REQUEST') {
    fetch('http://localhost:5001/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `
          mutation ImportCanvasTasks($input: importCanvasTasksInput!) {
            importCanvasTasks(input: $input) {
              id
              title
              dueDate
              stageId
              classCode
              description
              userId
            }
          }
        `,
        variables: {
          input: {
            taskInput: request.data.taskInput
          }
        }
      })
    })
      .then(response => response.json())
      .then(data => {
        console.log('Task import response:', data);
        sendResponse(data);
      })
      .catch(error => {
        console.error('Task import error:', error);
        sendResponse({ errors: [{ message: error.message }] });
      });

    return true; // Will respond asynchronously
  }
});

