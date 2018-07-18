/*global libsignal util*/
import {
  errors,
  findKeyBundles,
  getSessionRecordByRecipientIds,
  objectUtils,
  postEmail
} from './../utils/electronInterface';
import SignalProtocolStore from './store';
import { CustomError } from './../utils/CustomError';

const store = new SignalProtocolStore();

const getKeyBundlesOfRecipients = async (recipients, knownAddresses) => {
  const res = await findKeyBundles({
    recipients,
    knownAddresses
  });
  if (res.status !== 200) {
    return new Array(recipients.length).fill(null);
  }
  return res.body;
};

const encryptText = async (
  recipientId,
  deviceId,
  textMessage,
  arrayBufferKey
) => {
  const addressTo = new libsignal.SignalProtocolAddress(recipientId, deviceId);
  if (arrayBufferKey) {
    const sessionBuilder = new libsignal.SessionBuilder(store, addressTo);
    await sessionBuilder.processPreKey(arrayBufferKey);
  }
  const sessionCipher = new libsignal.SessionCipher(store, addressTo);
  const ciphertext = await sessionCipher.encrypt(textMessage);
  const body = util.toBase64(util.toArrayBuffer(ciphertext.body));
  return { body, type: ciphertext.type };
};

const keysToArrayBuffer = keys => {
  let preKey = undefined;
  if (keys.preKey) {
    preKey = {
      keyId: keys.preKey.id,
      publicKey: util.toArrayBufferFromBase64(keys.preKey.publicKey)
    };
  }
  return {
    identityKey: util.toArrayBufferFromBase64(keys.identityPublicKey),
    preKey,
    registrationId: keys.registrationId,
    signedPreKey: {
      keyId: keys.signedPreKeyId,
      publicKey: util.toArrayBufferFromBase64(keys.signedPreKeyPublic),
      signature: util.toArrayBufferFromBase64(keys.signedPreKeySignature)
    }
  };
};

const createEmails = async (
  body,
  recipients,
  knownAddresses,
  keyBundleJSONbyRecipientIdAndDeviceId,
  peer
) => {
  let result = [];
  for (const recipient of recipients) {
    const { recipientId, type } = recipient;
    const knownDeviceIds = knownAddresses[recipientId] || [];
    const deviceIdWithKeys = keyBundleJSONbyRecipientIdAndDeviceId[recipientId]
      ? Object.keys(keyBundleJSONbyRecipientIdAndDeviceId[recipientId]).map(
          deviceId => {
            return keyBundleJSONbyRecipientIdAndDeviceId[recipientId][deviceId];
          }
        )
      : [];
    const deviceIds = [...knownDeviceIds, ...deviceIdWithKeys];
    const criptextEmail = await Promise.all(
      deviceIds
        .filter(item => {
          const deviceId = typeof item === 'number' ? item : item.deviceId;
          return !(
            peer.recipientId === recipientId &&
            peer.deviceId === deviceId &&
            type === 'peer'
          );
        })
        .map(async item => {
          const deviceId = typeof item === 'number' ? item : item.deviceId;
          const keyBundleArrayBuffer =
            typeof item === 'object' ? keysToArrayBuffer(item) : undefined;
          const textEncrypted = await encryptText(
            recipientId,
            deviceId,
            body,
            keyBundleArrayBuffer
          );
          return {
            type,
            recipientId,
            deviceId,
            body: textEncrypted.body,
            messageType: textEncrypted.type
          };
        })
    );
    result = [...result, ...criptextEmail];
  }

  return result;
};

const encryptPostEmail = async ({
  recipients,
  externalRecipients,
  body,
  subject,
  threadId,
  files,
  peer
}) => {
  const recipientIds = recipients.map(item => item.recipientId);
  const isSendToMySelf =
    recipients.findIndex(item => {
      return item.recipientId === peer.recipientId && item.type !== peer.type;
    }) === -1
      ? false
      : true;
  const sessions = await getSessionRecordByRecipientIds(recipientIds);
  const knownAddresses = sessions.reduce((result, item) => {
    if (!item.recipientId) {
      return result;
    }
    return {
      ...result,
      [item.recipientId]: item.deviceIds.split(',').map(Number)
    };
  }, {});
  const keyBundles = await getKeyBundlesOfRecipients(
    recipientIds,
    knownAddresses
  );
  if (keyBundles.includes(null)) {
    throw new CustomError(errors.server.UNAUTHORIZED_ERROR);
  }

  const recipientsToSendAmount =
    recipientIds.length + (isSendToMySelf ? -1 : 0);
  const recipientDevicesAmount = sessions.length + keyBundles.length;

  if (
    !(recipientsToSendAmount <= recipientDevicesAmount) ||
    recipientDevicesAmount === 0
  ) {
    throw new CustomError(errors.message.NON_EXISTING_USERS);
  }
  const keyBundleJSONbyRecipientIdAndDeviceId = keyBundles.reduce(
    (result, keyBundle) => {
      const recipientId = keyBundle.recipientId;
      const deviceId = keyBundle.deviceId;
      const recipientKeys = result[recipientId] || {};
      const item = { ...recipientKeys, [deviceId]: keyBundle };
      return { ...result, [recipientId]: item };
    },
    {}
  );
  const criptextEmails = await createEmails(
    body,
    recipients,
    knownAddresses,
    keyBundleJSONbyRecipientIdAndDeviceId,
    peer
  );
  const guestEmail = {
    to: externalRecipients.to,
    cc: externalRecipients.cc,
    bcc: externalRecipients.bcc,
    body
  }
  const data = objectUtils.noNulls({
    guestEmail,
    criptextEmails,
    subject,
    threadId,
    files
  });
  const res = await postEmail(data);

  if (res.status !== 200) {
    throw new CustomError(errors.message.ENCRYPTING);
  }
  return res;
};

export default {
  encryptPostEmail
};
