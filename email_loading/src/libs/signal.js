/*global libsignal util*/

import { LabelType } from './../utils/electronInterface';
import {
  createLabel,
  postUser,
  createAccount as createAccountDB,
  getAccount,
  myAccount,
  errors
} from './../utils/electronInterface';
import { CustomError } from './../utils/CustomError';
import SignalProtocolStore from './store';

const KeyHelper = libsignal.KeyHelper;
const store = new SignalProtocolStore();

const createAccount = async ({
  recipientId,
  password,
  name,
  recoveryEmail
}) => {
  const preKeyId = 1;
  const signedPreKeyId = 1;
  const { identityKey, registrationId } = await generateIdentity();
  const {
    keybundle,
    preKeyPair,
    signedPreKeyPair
  } = await generatePreKeyBundle({
    identityKey,
    registrationId,
    preKeyId,
    signedPreKeyId
  });
  const res = await postUser({
    recipientId,
    password,
    name,
    recoveryEmail,
    keybundle
  });
  if (res.status === 400) {
    throw CustomError(errors.USER_ALREADY_EXISTS);
  }
  if (res.status !== 200) {
    return false;
  }

  const privKey = util.toBase64(identityKey.privKey);
  const pubKey = util.toBase64(identityKey.pubKey);
  const jwt = res.text;
  await createAccountDB({
    recipientId,
    deviceId: 1,
    name,
    jwt,
    privKey,
    pubKey,
    registrationId
  });
  const [newAccount] = await getAccount();
  myAccount.initialize(newAccount);
  await store.storeKeys({
    preKeyId,
    preKeyPair,
    signedPreKeyId,
    signedPreKeyPair
  });
  const labels = Object.values(LabelType);
  await createLabel(labels);

  return true;
};

const generateIdentity = () => {
  return Promise.all([
    KeyHelper.generateIdentityKeyPair(),
    KeyHelper.generateRegistrationId()
  ]).then(function(result) {
    const identityKey = result[0];
    const registrationId = result[1];
    return { identityKey, registrationId };
  });
};

const generatePreKeyBundle = async ({
  identityKey,
  registrationId,
  preKeyId,
  signedPreKeyId
}) => {
  const preKey = await KeyHelper.generatePreKey(preKeyId);
  const signedPreKey = await KeyHelper.generateSignedPreKey(
    identityKey,
    signedPreKeyId
  );
  const keybundle = {
    signedPreKeySignature: util.toBase64(signedPreKey.signature),
    signedPreKeyPublic: util.toBase64(signedPreKey.keyPair.pubKey),
    signedPreKeyId: signedPreKeyId,
    identityPublicKey: util.toBase64(identityKey.pubKey),
    registrationId: registrationId,
    preKeys: [{ publicKey: util.toBase64(preKey.keyPair.pubKey), id: preKeyId }]
  };

  const data = {
    keybundle,
    preKeyPair: preKey.keyPair,
    signedPreKeyPair: signedPreKey.keyPair
  };
  return data;
};

export default {
  createAccount,
  generatePreKeyBundle
};
