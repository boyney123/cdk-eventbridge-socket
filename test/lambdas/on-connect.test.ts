const onConnect = require('../../lib/lambda-fns/on-connect/on-connect.ts');

const mockDocumentPut = jest.fn((params: any) => Promise.resolve());

const event = {
  requestContext: {
    connectionId: 1,
  },
};

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: class {
      put(...params: any) {
        return {
          promise: () => mockDocumentPut(params),
        };
      }
    },
  },
}));

describe('on-connection lambda function', () => {
  it('takes the given event (websocket connection) and writes the connection to DynamoDB', async () => {
    const response = await onConnect.handler(event);
    expect(mockDocumentPut).toHaveBeenCalledWith([
      { Item: { connectionId: 1 }, TableName: 'connections' },
    ]);
    expect(response).toEqual({
      statusCode: 200,
      body: 'Connected',
    });
  });

  it('returns a 500 status when failing to write connection to DynamoDB', async () => {
    mockDocumentPut.mockImplementationOnce(() => Promise.reject());
    const response = await onConnect.handler(event);
    expect(response.statusCode).toEqual(500);
  });
});
