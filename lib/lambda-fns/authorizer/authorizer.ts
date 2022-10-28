import { getSecretValue } from './secretsmanager';

type ApigatewayWebsocketLambdaAuthorizerEvent = {
  headers: Record<string, string>;
  queryStringParameters: Record<string, string>;
  methodArn: string;
};
export const handler = async ({ methodArn, queryStringParameters }: ApigatewayWebsocketLambdaAuthorizerEvent) => {
  // Retrieve request parameters from the Lambda function input:

  if (!queryStringParameters || queryStringParameters == null) {
    console.log('No queryStringParameters found');
    return 'Unauthorized';
  }

  const apiKey = await getSecretValue();

  if (queryStringParameters['apiKey'] !== apiKey) {
    console.log("API Key doesn't match");
    return 'Unauthorized';
  }
  const apigatewayAuthorizerAllowPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: 'Allow',
        Resource: methodArn,
      },
    ],
  };
  console.log('Access granted');
  const resp = {
    principalId: 'authenticated-user',
    policyDocument: apigatewayAuthorizerAllowPolicy,
  };
  console.log(JSON.stringify(resp));
  return resp;
};
