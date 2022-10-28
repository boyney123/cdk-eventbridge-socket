import { SecretsManager } from 'aws-sdk';

const secretClient = new SecretsManager();

export const getSecretValue = async (): Promise<string> => {
  const secretString = await (await secretClient.getSecretValue({ SecretId: process.env.API_KEY_SECRET! }).promise()).SecretString;
  if (!secretString) {
    throw new Error(`Secret string not found in secret ${process.env.API_KEY_SECRET}`);
  }
  return secretString;
};
