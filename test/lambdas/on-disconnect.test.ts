const onDisconnect = require('../../lib/lambda-fns/on-disconnect/on-disconnect.ts');

const mockDocumentDelete = jest.fn((params: any) => Promise.resolve());

const event = {
  requestContext: {
    connectionId: 1,
  },
};

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: class {
      delete(...params: any) {
        return {
          promise: () => mockDocumentDelete(params),
        };
      }
    },
  },
}));

describe('on-connection lambda function', () => {
  it('takes the given event (websocket connection) and deleted the connection to DynamoDB', async () => {
    const response = await onDisconnect.handler(event);
    expect(mockDocumentDelete).toHaveBeenCalledWith([
      { Key: { connectionId: 1 }, TableName: 'connections' },
    ]);
    expect(response).toEqual({
      statusCode: 200,
      body: 'Disconnected',
    });
  });

  it('returns a 500 status when failing to delete connection from DynamoDB', async () => {
    mockDocumentDelete.mockImplementationOnce(() => Promise.reject());
    const response = await onDisconnect.handler(event);
    expect(response.statusCode).toEqual(500);
  });
});

export {};
