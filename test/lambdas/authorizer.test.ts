import { handler } from '../../lib/lambda-fns/authorizer/authorizer';
import * as secretsmanager from '../../lib/lambda-fns/authorizer/secretsmanager';

describe('authorizer', () => {
  it('return allow policy for method arn if apiKey match', async () => {
    jest.spyOn(secretsmanager, 'getSecretValue').mockResolvedValue('some-api-key');
    const event = {
      headers: {},
      queryStringParameters: {
        apiKey: 'some-api-key',
      },
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:11111/prod/$connect',
    };
    const response = await handler(event);
    expect(response).toEqual({
      principalId: 'authenticated-user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: 'arn:aws:execute-api:us-east-1:123456789012:11111/prod/$connect',
          },
        ],
      },
    });
  });

  it("should return 'Unauthorized' if apiKey doesn't match", async () => {
    jest.spyOn(secretsmanager, 'getSecretValue').mockResolvedValue('some-api-key');
    const event = {
      headers: {},
      queryStringParameters: {
        apiKey: 'wrong-api-key',
      },
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:11111/prod/$connect',
    };
    const response = await handler(event);
    expect(response).toEqual('Unauthorized');
  });

  it("should return 'Unauthorized' if apiKey is missing", async () => {
    jest.spyOn(secretsmanager, 'getSecretValue').mockResolvedValue('some-api-key');
    const event = {
      headers: {},
      queryStringParameters: {},
      methodArn: 'arn:aws:execute-api:us-east-1:123456789012:11111/prod/$connect',
    };
    const response = await handler(event);
    expect(response).toEqual('Unauthorized');
  });
});
