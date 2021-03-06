import CryptoJS from 'crypto-js';

const saltSize = 8;
const ivSize = 16;

/*   AES
---------------------*/
export const AesDecrypt = (encryptedDataB64, keyArray, ivArray) => {
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Base64.parse(encryptedDataB64)
  });
  return CryptoJS.AES.decrypt(cipherParams, keyArray, {
    iv: ivArray
  });
};

export const resultString = value => {
  return value.toString(CryptoJS.enc.Utf8);
};

/*   Key
---------------------*/
export const generateKey = (phrase, optionalSaltArray) => {
  const passphrase = phrase || CryptoJS.lib.WordArray.random(saltSize);
  const salt = optionalSaltArray || CryptoJS.lib.WordArray.random(saltSize);
  const keyParams = {
    hasher: CryptoJS.algo.SHA256,
    iterations: 10000,
    keySize: 128 / 32
  };
  const keyArray = CryptoJS.PBKDF2(passphrase, salt, keyParams);
  return {
    key: keyArray.toString(CryptoJS.enc.Base64),
    salt: salt.toString(CryptoJS.enc.Base64)
  };
};

export const generateKeyAndIv = (
  phrase,
  optionalSaltArray,
  optionalIvArray
) => {
  const { key, salt } = generateKey(phrase, optionalSaltArray);
  const ivArray = optionalIvArray || CryptoJS.lib.WordArray.random(ivSize);
  return {
    salt,
    key,
    iv: ivArray.toString(CryptoJS.enc.Base64)
  };
};

/*   Base 64
---------------------*/
export const base64ToWordArray = base64String => {
  return CryptoJS.enc.Base64.parse(base64String);
};

export const base64ToByteArray = base64String => {
  const wordArray = base64ToWordArray(base64String);
  return wordArrayToByteArray(wordArray);
};

/*   WordArray
---------------------*/
export const wordArrayToBase64 = wordArray => {
  return CryptoJS.enc.Base64.stringify(wordArray);
};

export const wordArrayToByteArray = (wordarray, length) => {
  if (
    wordarray.hasOwnProperty('sigBytes') &&
    wordarray.hasOwnProperty('words')
  ) {
    length = wordarray.sigBytes;
    wordarray = wordarray.words;
  }
  const result = [];
  let i = 0;
  let bytes;
  while (length > 0) {
    bytes = wordToByteArray(wordarray[i], Math.min(4, length));
    length -= bytes.length;
    result.push(bytes);
    i++;
  }
  return [].concat.apply([], result);
};

const wordToByteArray = (word, length) => {
  const ba = [];
  const xFF = 0xff;
  if (length > 0) ba.push(word >>> 24);
  if (length > 1) ba.push((word >>> 16) & xFF);
  if (length > 2) ba.push((word >>> 8) & xFF);
  if (length > 3) ba.push(word & xFF);
  return ba;
};

/*   ByteArray
---------------------*/
export const byteArrayToWordArray = bytearray => {
  const wa = [];
  let i;
  for (i = 0; i < bytearray.length; i++) {
    wa[(i / 4) | 0] |= bytearray[i] << (24 - 8 * i);
  }
  return CryptoJS.lib.WordArray.create(wa, bytearray.length);
};

export const byteArrayToBase64 = bytearray => {
  const wordArray = byteArrayToWordArray(bytearray);
  return wordArrayToBase64(wordArray);
};

/* Recovery Key
--------------------*/

export const AesEncrypt = (data, keyArray, ivArray) => {
  const encrypted = CryptoJS.AES.encrypt(data, keyArray, { iv: ivArray });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
};

const generatePassword = () => {
  return (
    Math.random()
      .toString(36)
      .slice(-8) +
    Math.random()
      .toString(36)
      .slice(-8) +
    Math.random()
      .toString(36)
      .slice(-8)
  );
};

export const encryptPin = async pincode => {
  const recoveryKey = generatePassword();
  const { salt, iv, key } = generateKeyAndIv(recoveryKey);
  const content = await AesEncrypt(
    pincode,
    base64ToWordArray(key),
    base64ToWordArray(iv)
  );
  return {
    salt: base64ToByteArray(salt),
    iv: base64ToByteArray(iv),
    encryptedPin: base64ToByteArray(content),
    recoveryKey
  };
};
