let linkList = document.querySelector('div.link-list');
let links;
let messageToEdit;
const recordTemplate = document.querySelector('div.message');

function makeMessage(record) {
  const linkMessage = recordTemplate.cloneNode(true);
  linkMessage.linkId = record._id;
  const p = linkMessage.querySelector('p.link-para');
  if (record.isLink) {
    const a = document.createElement('a');
    a.style.lineBreak = 'anywhere';
    a.innerHTML = record.link;
    a.href = record.link;
    a.target = '_blank';
    p.appendChild(a);
    linkMessage.isLink = true;
  } else {
    p.innerHTML = record.link;
    linkMessage.isLink = false;
  }

  const description = linkMessage.querySelector('p.description');
  description.innerHTML = record.description;
  description.style.lineBreak = 'normal';

  linkMessage.classList.add('user-link');

  return linkMessage;
}

axios.get('/api/v1/links')
  .then((res) => {
    links = res.data;
    if (links.length === 0) {
      return; 
    }

    for (let index = 0; index < links.length; index++) {
      const record = links[index];
      const linkMessage = makeMessage(record);
      linkList.insertBefore(linkMessage, linkList.firstChild);
      linkMessage.classList.remove('is-hidden');
    }
  })
  .catch((err) => {
    console.log(err);
});

// Edit Link Overlay
const editModal = document.querySelector('div.edit-modal');
const editModalLinkInput = editModal.querySelector('input.link-edit-input');
const editModalDescriptionTextArea = editModal.querySelector('textarea.description-edit-textarea');
const editModalCloseBtn = editModal.querySelector('.close-edit-modal');
editModalCloseBtn.addEventListener('click', (event) => {
  editModalLinkInput.value = '';
  editModalDescriptionTextArea.value = '';
  editModal.classList.remove('is-active');
  messageToEdit = null;
});
const editModalSaveBtn = editModal.querySelector('.edit-save-button');
editModalSaveBtn.addEventListener('click', (event) => {
  if (editModalLinkInput.value === '' && editModalDescriptionTextArea.value === '') {
    return;
  }

  axios.put('/api/v1/editlink', { id: editModal.linkId, link: editModalLinkInput.value, description: editModalDescriptionTextArea.value })
  .then((res) => {
    if (!res.data) {
      return;
    }

    const record = res.data;
    editModal.linkId = null;
    editModalLinkInput.value = '';
    editModalDescriptionTextArea.value = '';
    editModal.classList.remove('is-active');
    const updatedLinkMessage = makeMessage(record);
    linkList.replaceChild(updatedLinkMessage, messageToEdit);
    updatedLinkMessage.classList.remove('is-hidden');
    messageToEdit = null;
  })
  
});

// Delete Link Overlay
const deleteModal = document.querySelector('.delete-modal');
const deleteModalBody = deleteModal.querySelector('section.modal-card-body');
const deleteModalCloseBtn = deleteModal.querySelector('.close-delete-modal');
deleteModalCloseBtn.addEventListener('click', (event) => {
  const linkCard = deleteModal.querySelector('.message');
  if (linkCard.parentNode) {
    linkCard.parentNode.removeChild(linkCard);
  }

  deleteModal.classList.remove('is-active');
});
deleteModalConfirmBtn = deleteModal.querySelector('.delete-confirm-button');
deleteModalConfirmBtn.addEventListener('click', (event) => {
  const deleteData = { id: messageToEdit.linkId };
  axios.post('/api/v1/deletelink', deleteData)
  .then((res) => {
    if (!res.data) {
      return;
    }

    // clear and close overlay
    deleteModalBody.removeChild(deleteModalBody.querySelector('.message'));
    deleteModal.classList.remove('is-active');

    // delete the card from the list
    linkList.removeChild(messageToEdit);
    messageToEdit = null;
  })
  .catch((error) => {
    console.log(error);
  });
});

// New Link
const newLinkInput = document.querySelector('.link-input');
const newDescriptionTextarea = document.querySelector('.link-textarea');
document.querySelector('button.new-link').addEventListener('click', (event) => {
  if (newLinkInput.value === '' && newDescriptionTextarea.value === '') {
    return;
  }

  axios.post('/api/v1/newlink', { link: newLinkInput.value, description: newDescriptionTextarea.value })
  .then((res) => {
    const newRecord = res.data;
    if (!newRecord) {
      return;
    }

    newLinkInput.value = '';
    newDescriptionTextarea.value = '';
    const newMessage = makeMessage(newRecord);
    linkList.insertBefore(newMessage, linkList.firstChild);
    newMessage.classList.remove('is-hidden');
  })
  .catch((error) => {
    console.log(error);
  })
});

// Delete button
document.querySelector('main').addEventListener('click', (event) => {
  if (!(event.target.tagName === 'BUTTON' && event.target.classList.contains('delete-link-button'))) {
    return;
  }

  messageToEdit = event.target.closest('.message');
  if (!messageToEdit) {
    return;
  }

  const newCard = messageToEdit.cloneNode(true);
  const editBtn = newCard.querySelector('button.edit-link-button');
  if (editBtn && editBtn.parentNode) {
    editBtn.parentNode.removeChild(editBtn);
  }

  const deleteBtn = newCard.querySelector('button.delete');
  if (deleteBtn && deleteBtn.parentNode) {
    deleteBtn.parentNode.removeChild(deleteBtn);
  }

  deleteModalBody.appendChild(newCard);
  deleteModal.classList.add('is-active');
});

// Edit button
document.querySelector('main').addEventListener('click', (event) => {
  const editBtn = event.target.closest('button.edit-link-button');
  if (!editBtn) {
    return;
  }

  messageToEdit = event.target.closest('.message');
  let link;
  if (messageToEdit.isLink) {
    link = messageToEdit.querySelector('a').innerHTML.trim();
  } else {
    link =  messageToEdit.querySelector('p.link-para').innerHTML.trim();
  }

  let description = messageToEdit.querySelector('p.description').innerHTML.trim();
  editModalLinkInput.value = link;
  editModalDescriptionTextArea.value = description;
  editModal.linkId = messageToEdit.linkId;
  editModal.classList.add('is-active');
});

// FAQ Modal
const faqModal = document.querySelector('.faq-modal');
document.querySelector('.faq-icon').addEventListener('click', (event) => {
  faqModal.classList.add('is-active');
});

// FAQ Modal Close
document.querySelector('.faq-close').addEventListener('click', (event) => {
  faqModal.classList.remove('is-active');
});

// Delete All Modal
const deleteAllModal = document.querySelector('.delete-all-modal');
document.querySelector('.trash-icon').addEventListener('click', (event) => {
  deleteAllModal.classList.add('is-active');
});

// Delete All Modal Close
const deleteAllCheckbox = document.querySelector('.delete-all-checkbox');
document.querySelector('.cancel-delete-all').addEventListener('click', (event) => {
  deleteAllModal.classList.remove('is-active');
  deleteAllCheckbox.checked = false;
});

// Delete All Confirm
document.querySelector('.delete-all-button').addEventListener('click', (event) => {
  if (deleteAllCheckbox.checked) {
    axios.post('/api/v1/deleteall', { deleteAll: true })
    .then((res) => {
      deleteAllModal.classList.remove('is-active');
      deleteAllCheckbox.checked = false;

      const linksToRemove = document.querySelectorAll('.user-link');
      linksToRemove.forEach(link => {
        linkList.removeChild(link);
      });

      const count = res.data;
      const para = document.querySelector('.delete-message-para');
      if (count === 1) {
        para.innerHTML = `1 link deleted forever`;
      } else {
        para.innerHTML = `${count} links deleted forever`;
      }
      
      document.querySelector('.delete-message-modal').classList.add('is-active');
    });
  }
});

// Delete Message Modal Close
const deleteMessageCloseBtn = document.querySelector('.delete-message-close');
deleteMessageCloseBtn.addEventListener('click', (event) => {
  document.querySelector('.delete-message-modal').classList.remove('is-active');
});
