import { connect } from 'react-redux';
import EmailView from './../components/EmailWrapper';
import { defineTimeByToday } from './../utils/TimeUtils';
import { getTwoCapitalLetters } from './../utils/StringUtils';
import { matchOwnEmail } from './../utils/UserUtils';
import randomcolor from 'randomcolor';
import { myAccount, openEmailInComposer } from './../utils/electronInterface';
import { muteEmail, markEmailUnread } from './../actions/index';

const mapStateToProps = (state, ownProps) => {
  const email = ownProps.email;
  const contacts = state.get('contacts');
  const from = getContacts(contacts, email.get('from'));
  const to = getContacts(contacts, email.get('to'));
  const cc = getContacts(contacts, email.get('cc'));
  const bcc = getContacts(contacts, email.get('bcc'));
  const senderName = from.length ? from[0].name : '';
  const senderEmail = from.length ? from[0].email : '';
  const color = senderEmail
    ? randomcolor({
        seed: senderName || senderEmail,
        luminosity: 'bright'
      })
    : 'transparent';
  const letters = getTwoCapitalLetters(senderName || senderEmail || '');
  const subject = email.get('subject');
  const myEmail = email.merge({
    date: defineTimeByToday(email.get('date')),
    subject: subject ? '(No Subject)' : subject,
    from,
    to,
    cc,
    bcc,
    color,
    letters
  });
  return {
    email: myEmail.toJS(),
    classStatus: myEmail.get('unsent') ? 'email-unsent' : 'email-normal',
    attachments: myEmail.get('attachments') ? myEmail.get('attachments') : [],
    isFromMe: matchOwnEmail(myAccount.recipientId, senderEmail)
  };
};

const getContacts = (contacts, contactIds) => {
  return !contactIds
    ? []
    : contactIds.toArray().map(contactId => {
        return contacts.size && contacts.get(contactId)
          ? contacts.get(contactId).toObject()
          : { id: contactId };
      });
};

const mapDispatchToProps = (dispatch, ownProps) => {
  const email = ownProps.email;
  const isLast = ownProps.staticOpen;
  return {
    toggleMute: ev => {
      ev.stopPropagation();
      const emailId = String(email.get('id'));
      const valueToSet = email.get('isMuted') === 1 ? false : true;
      dispatch(muteEmail(emailId, valueToSet));
    },
    markUnread: () => {
      const unreadValue = email.get('unread') ? 0 : 1;
      dispatch(markEmailUnread(email.get('id'), unreadValue));
    },
    onReplyEmail: ev => {
      ev.stopPropagation();
      const key = email.get('key');
      openEmailInComposer({ key, type: 'reply' });
    },
    onReplyLast: () => {
      if (isLast) {
        const key = email.get('key');
        openEmailInComposer({ key, type: 'reply' });
      }
    },
    onReplyAll: ev => {
      ev.stopPropagation();
      const key = email.get('key');
      openEmailInComposer({ key, type: 'reply-all' });
    },
    onForward: ev => {
      ev.stopPropagation();
      const key = email.get('key');
      openEmailInComposer({ key, type: 'forward' });
    }
  };
};

const Email = connect(mapStateToProps, mapDispatchToProps)(EmailView);

export default Email;
